import { useState, useEffect, useRef } from 'react'
import './App.css'
import SockJS from 'sockjs-client'
import * as Stomp from 'stompjs'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Trophy, MessageSquare, Loader2, Sparkles, Volume2, VolumeX, LogIn, Sun, Moon, Flag, Zap, Award } from 'lucide-react'

type GamePhase = 'QUESTION' | 'REVEAL' | 'INTERMISSION' | 'PODIUM'

interface PlayerScore {
  username: string
  points: number
  streak: number
  lastComment: string | null
  isOnline: boolean
  xp: number
  level: number
  title: string | null
}

interface Question {
  id: number
  content: string
  category?: string
}

interface GameState {
  phase: GamePhase
  remainingTime: number
  question?: Question
  correctAnswers?: string[]
  leaderboard: PlayerScore[]
  currentQuestionNumber: number
  totalQuestionsInRound: number
}

interface ChatMessage {
  username: string
  content: string
}

interface FloatingReaction {
  id: number
  emoji: string
  x: number
}

function App() {
  const [username, setUsername] = useState(localStorage.getItem('trivia_pseudo') || '')
  const [isJoined, setIsJoined] = useState(!!localStorage.getItem('trivia_pseudo'))
  const [isMuted, setIsMuted] = useState(localStorage.getItem('trivia_muted') === 'true')
  const [theme, setTheme] = useState(localStorage.getItem('trivia_theme') || 'dark')
  const [gameState, setGameState] = useState<GameState | null>(null)
  
  const [userAnswer, setUserAnswer] = useState('')
  const [isCorrect, setIsCorrect] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [correctlySubmittedAnswer, setCorrectlySubmittedAnswer] = useState('')
  const [lastAttemptWrong, setLastAttemptWrong] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [currentChatMessage, setCurrentChatMessage] = useState('')
  const [waitingForNextQuestion, setWaitingForNextQuestion] = useState(false)
  const [reactions, setReactions] = useState<FloatingReaction[]>([])
  const [isCatAwake, setIsCatAwake] = useState(false)
  
  const stompClient = useRef<Stomp.Client | null>(null)
  const isConnecting = useRef(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const catWakeTimer = useRef<NodeJS.Timeout | null>(null)

  const playPop = () => !isMuted && new Audio('https://actions.google.com/sounds/v1/cartoon/pop.ogg').play().catch(()=>{})
  const playError = () => !isMuted && new Audio('https://actions.google.com/sounds/v1/cartoon/cartoon_cowbell.ogg').play().catch(()=>{})
  const playTick = () => !isMuted && new Audio('https://actions.google.com/sounds/v1/alarms/mechanical_clock_tick.ogg').play().catch(()=>{})
  const playTada = () => !isMuted && new Audio('https://actions.google.com/sounds/v1/crowds/crowd_cheer_and_applause.ogg').play().catch(()=>{})
  const playSwoosh = () => !isMuted && new Audio('https://actions.google.com/sounds/v1/foley/swoosh.ogg').play().catch(()=>{})

  const wakeCat = () => {
    setIsCatAwake(true)
    if (catWakeTimer.current) clearTimeout(catWakeTimer.current)
    catWakeTimer.current = setTimeout(() => setIsCatAwake(false), 1200)
  }

  const getCatColor = (name: string) => {
    const colors = ['#444444', '#9ca3af', '#fb923c', '#b45309', '#111827', '#8b5cf6', '#10b981', '#f43f5e'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  const catColor = getCatColor(username || 'Invité');

  const toggleMute = () => {
    const newVal = !isMuted
    setIsMuted(newVal)
    localStorage.setItem('trivia_muted', newVal.toString())
  }

  const toggleTheme = (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem('trivia_theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const addEmote = (emote: string) => setCurrentChatMessage(prev => prev + emote)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const pingInterval = setInterval(() => {
      if (stompClient.current?.connected && username) {
        stompClient.current.send('/app/ping', {}, username)
      }
    }, 5000)
    return () => clearInterval(pingInterval)
  }, [username, theme])

  useEffect(() => {
    if (gameState?.phase === 'QUESTION' && gameState.remainingTime <= 5 && gameState.remainingTime > 0 && !isCorrect) {
      playTick()
    }
  }, [gameState?.remainingTime, isCorrect, gameState?.phase])

  useEffect(() => {
    if (isJoined && !isConnecting.current) {
      isConnecting.current = true
      const socket = new SockJS('/ws-trivia')
      stompClient.current = Stomp.over(socket)
      stompClient.current.debug = () => {}
      
      stompClient.current.connect({}, () => {
        isConnecting.current = false
        if (!stompClient.current || !stompClient.current.connected) return

        stompClient.current.subscribe('/topic/game', (message) => {
          const newState: GameState = JSON.parse(message.body)
          setGameState(prev => {
            if (prev === null && newState.phase === 'QUESTION') setWaitingForNextQuestion(true)
            if (prev?.phase !== 'QUESTION' && newState.phase === 'QUESTION') {
              setWaitingForNextQuestion(false); setUserAnswer(''); setIsCorrect(false); setPointsEarned(0); setCorrectlySubmittedAnswer(''); setLastAttemptWrong(false)
            }
            if (prev?.phase !== 'PODIUM' && newState.phase === 'PODIUM') playTada()
            
            if (prev && newState.leaderboard.length > 0) {
                const oldRank = prev.leaderboard.findIndex(p => p.username === username)
                const newRank = newState.leaderboard.findIndex(p => p.username === username)
                if (newRank !== -1 && oldRank !== -1 && newRank < oldRank) playSwoosh()
            }
            return newState
          })
        })

        stompClient.current.subscribe('/user/topic/answer-feedback', (message) => {
          const response = JSON.parse(message.body)
          if (response.correct) {
            playPop(); setIsCorrect(true); setPointsEarned(response.pointsEarned); setCorrectlySubmittedAnswer(response.submittedAnswer || ''); setLastAttemptWrong(false)
            confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ['#8b5cf6', '#10b981', '#3b82f6', '#ffffff'] })
          } else {
            playError(); setLastAttemptWrong(true); setTimeout(() => setLastAttemptWrong(false), 600)
          }
        })

        stompClient.current.subscribe('/topic/reactions', (message) => {
          const reaction = JSON.parse(message.body)
          const newReaction = { id: Date.now() + Math.random(), emoji: reaction.emoji, x: 20 + Math.random() * 60 }
          setReactions(prev => [...prev, newReaction])
          setTimeout(() => setReactions(prev => prev.filter(r => r.id !== newReaction.id)), 3000)
        })

        stompClient.current.subscribe('/topic/chat', (message) => {
          const msg = JSON.parse(message.body)
          setChatMessages(prev => [...prev.slice(-49), msg])
          wakeCat()
        })

        stompClient.current.subscribe('/user/topic/stats-feedback', (message) => {
          const stats = JSON.parse(message.body)
          setChatMessages(prev => [...prev.slice(-49), { 
            username: 'SYSTÈME', 
            content: `📊 Vos stats : ${stats.points} pts | Rang : #${stats.rank} | Série : ${stats.streak} 🔥` 
          }])
        })
      }, () => { isConnecting.current = false })

      return () => {
        if (stompClient.current?.connected) stompClient.current.disconnect(() => {})
        isConnecting.current = false
      }
    }
  }, [isJoined])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  const joinGame = () => { if (username.trim()) { localStorage.setItem('trivia_pseudo', username); setIsJoined(true) } }

  const submitAnswer = () => {
    if (gameState?.phase === 'QUESTION' && !isCorrect && !waitingForNextQuestion && userAnswer.trim()) {
      stompClient.current?.send('/app/answer', {}, JSON.stringify({ username, answer: userAnswer }))
      setUserAnswer('')
    }
  }

  const sendReaction = (emoji: string) => {
    if (stompClient.current?.connected) {
      stompClient.current.send('/app/reaction', {}, JSON.stringify({ username, emoji }))
    }
  }

  const reportQuestion = () => {
    if (gameState?.question && stompClient.current?.connected) {
      stompClient.current.send('/app/report', {}, JSON.stringify({ questionId: gameState.question.id, username, reason: "Signalé" }))
      alert("Merci, la question a été signalée.")
    }
  }

  const sendChatMessage = () => {
    if (currentChatMessage.trim() === '/stats') {
      stompClient.current?.send('/app/stats', {}, username)
      setCurrentChatMessage('')
    } else if (currentChatMessage.trim()) {
      stompClient.current?.send('/app/chat', {}, JSON.stringify({ username, content: currentChatMessage }))
      setCurrentChatMessage('')
    }
  }

  if (!isJoined) {
    return (
      <div className="app-container">
        <motion.div className="login-screen glass-panel" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}>
          <div className="logo">TRIVIA</div>
          <div className="subtitle">La culture générale, réinventée.</div>
          <input className="login-input" type="text" placeholder="Pseudo..." value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && joinGame()} autoFocus />
          <button className="login-btn" onClick={joinGame} disabled={!username.trim()}>Jouer</button>
        </motion.div>
      </div>
    )
  }

  if (!gameState) return <div className="app-container"><Loader2 className="spinner" size={50} color="#8b5cf6" /></div>

  const { phase, remainingTime, question, correctAnswers, leaderboard, currentQuestionNumber, totalQuestionsInRound } = gameState
  const totalPhaseTime = phase === 'QUESTION' ? 15 : phase === 'REVEAL' ? 5 : phase === 'PODIUM' ? 60 : 3
  const timerPercent = (remainingTime / totalPhaseTime) * 100
  const roundProgress = (currentQuestionNumber / totalQuestionsInRound) * 100

  return (
    <div className="app-container">
      <AnimatePresence>
        {reactions.map(r => (
          <motion.div key={r.id} className="floating-reaction" initial={{ y: '100vh', opacity: 1, x: `${r.x}vw` }} animate={{ y: '-10vh', opacity: 0 }} transition={{ duration: 3, ease: "easeOut" }}>
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="action-bar">
        <div className="theme-toggle">
          <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => toggleTheme('light')}><Sun size={18} /></button>
          <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => toggleTheme('dark')}><Moon size={18} /></button>
        </div>
        <button className="action-btn" onClick={toggleMute}>{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
        <button className="action-btn" onClick={reportQuestion} title="Signaler"><Flag size={18} /></button>
        <button className="action-btn google-login-btn"><LogIn size={18} /> <span>Compte</span></button>
      </div>

      <div className="main-layout">
        <div className="game-section">
          <motion.div className="round-progress-container">
            <div className="round-info-text"><span>Manche en cours</span><span>{currentQuestionNumber} / {totalQuestionsInRound}</span></div>
            <div className="round-bar-bg"><motion.div className="round-bar-fill" animate={{ width: `${roundProgress}%` }} /></div>
          </motion.div>

          <motion.div className={`game-card glass-panel phase-${phase.toLowerCase()} ${isCorrect ? 'phase-reveal' : ''}`} layout>
            <div className="timer-container"><div className="timer-bar" style={{ width: `${timerPercent}%` }}></div></div>
            <div className="phase-badge">{phase === 'PODIUM' ? <Award size={16} /> : isCorrect ? <Sparkles size={16} /> : <Zap size={16} />} {isCorrect ? 'BRAVO !' : phase === 'QUESTION' ? `Question ${currentQuestionNumber}/${totalQuestionsInRound}` : 'Attente...'}</div>

            <AnimatePresence mode="wait">
              {phase === 'PODIUM' ? (
                <motion.div key="podium" className="podium-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="podium-title">Vainqueurs</div>
                  <div className="podium-visual">
                    {leaderboard[1] && <div className="podium-step"><div className="podium-name">{leaderboard[1].username}</div><div className="podium-bar second">2</div></div>}
                    {leaderboard[0] && <div className="podium-step"><div className="podium-name" style={{fontSize: '1.5rem'}}>{leaderboard[0].username}</div><div className="podium-score" style={{fontSize: '1.1rem', fontWeight: 800}}>{leaderboard[0].points} pts</div><div className="podium-bar first">1</div></div>}
                    {leaderboard[2] && <div className="podium-step"><div className="podium-name">{leaderboard[2].username}</div><div className="podium-score">{leaderboard[2].points} pts</div><div className="podium-bar third">3</div></div>}
                  </div>
                </motion.div>
              ) : (waitingForNextQuestion || phase === 'INTERMISSION') ? (
                <motion.div key="transition" className="preparation-view"><Loader2 className="spinner" size={40} color="#8b5cf6" /><div className="prep-text">Prochaine question...</div></motion.div>
              ) : question ? (
                <motion.div key={question.id} style={{ width: '100%', textAlign: 'center' }}>
                  <div className="question-text">{question.content}</div>
                  {phase === 'QUESTION' && !isCorrect ? (
                    <div className="answer-input-container">
                      <input className={`answer-input ${lastAttemptWrong ? 'wrong-flash' : ''}`} type="text" placeholder="Réponse..." value={userAnswer} onChange={e => setUserAnswer(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitAnswer()} autoFocus />
                    </div>
                  ) : (
                    <div className="reveal-answer" style={{color: isCorrect ? 'var(--success)' : 'var(--error)'}}>{isCorrect ? (correctlySubmittedAnswer || 'Correct !') : (correctAnswers && correctAnswers[0])}</div>
                  )}
                  {isCorrect && phase === 'QUESTION' && <div className="status-message reveal-correct">+{pointsEarned} pts !</div>}
                </motion.div>
              ) : <div className="question-text">Initialisation...</div>}
            </AnimatePresence>
          </motion.div>

          <div className="leaderboard glass-panel">
            <div className="leaderboard-header"><Trophy size={28} color="#fbbf24" /> <span>Classement</span></div>
            <div className="leaderboard-list">
              <AnimatePresence>
                {leaderboard.map((player, index) => (
                  <motion.div key={player.username} className={`leaderboard-item rank-${index + 1} ${player.username === username ? 'is-me' : ''}`} layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                    <div className="rank-badge">{index + 1}</div>
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`} alt="avatar" className="player-avatar" />
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '0.5rem' }}>
                      <span className="username">{player.username} <div className={`status-dot ${player.isOnline ? 'online' : 'offline'}`} /></span>
                      <span className="player-comment">{player.title || "Novice"} • Niv. {player.level}</span>
                    </div>
                    <div className="score-container"><span className="score-val">{player.points}</span><span className="score-label">pts</span></div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="chat-section glass-panel">
          <div className="chat-header"><MessageSquare size={20} color="var(--primary)" /> Discussion</div>
          <div className="chat-messages">
            <AnimatePresence initial={false}>
              {chatMessages.map((msg, i) => {
                const isMe = msg.username === username;
                const isSystem = msg.username === 'SYSTÈME';

                return (
                  <motion.div 
                    key={i} 
                    className={`chat-message-group ${isSystem ? 'is-system' : isMe ? 'is-me' : 'is-other'}`}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {!isSystem && <span className="chat-user-label">{msg.username}</span>}
                    <div className="chat-bubble">
                      <span className="content">{msg.content}</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={chatEndRef} />
            <div className={`pixel-cat-container ${isCatAwake ? 'is-awake' : ''}`}>
              <div className="zzz-box"><span className="single-zzz">Z</span><span className="single-zzz" style={{ animationDelay: '1.3s' }}>Z</span><span className="single-zzz" style={{ animationDelay: '2.6s' }}>Z</span></div>
              <div className="alert-icon">!</div>
              <div className="pixel-cat-wrapper"><div className="cat-body" style={{ backgroundColor: catColor }}><div className="cat-face"><div className="cat-eye"></div><div className="cat-eye"></div></div><div className="cat-tail"></div></div></div>
            </div>
          </div>
          <div className="chat-input-wrapper">
            <div className="chat-emotes">
              {['👍', '🔥', '😂', '🤔', '👏', '🧠', '🤯', '🚀', '⭐', '💡'].map(emote => (
                <button key={emote} className="emote-btn" onClick={() => { addEmote(emote); sendReaction(emote); }}>{emote}</button>
              ))}
            </div>
            <div className="chat-input-area">
              <input type="text" placeholder="Message..." value={currentChatMessage} onChange={e => setCurrentChatMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()} />
              <button className="chat-btn" onClick={sendChatMessage}><Send size={18} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
