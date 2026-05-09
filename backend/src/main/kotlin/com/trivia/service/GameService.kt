package com.trivia.service

import com.trivia.domain.Question
import com.trivia.dto.*
import com.trivia.repository.QuestionRepository
import org.apache.commons.text.similarity.LevenshteinDistance
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.scheduling.annotation.EnableScheduling
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.util.concurrent.atomic.AtomicInteger
import java.text.Normalizer
import java.util.concurrent.ConcurrentHashMap

@Service
@EnableScheduling
class GameService(
    private val questionRepository: QuestionRepository,
    private val redisTemplate: StringRedisTemplate,
    private val messagingTemplate: SimpMessagingTemplate
) {
    private var currentQuestion: Question? = null
    private var phase = GamePhase.INTERMISSION
    private val timer = AtomicInteger(0)
    private val LEADERBOARD_KEY = "trivia:leaderboard"
    private val XP_KEY = "trivia:xp"
    private val REPORTS_KEY = "trivia:reports"
    
    private val answeredUsers = mutableSetOf<String>()
    private val usedQuestionIds = mutableSetOf<Long>()
    private val playerStreaks = ConcurrentHashMap<String, Int>()
    private val playerComments = ConcurrentHashMap<String, String>()
    private val onlinePlayers = ConcurrentHashMap<String, Long>()
    
    private var currentQuestionNumber = 0
    private val QUESTIONS_PER_ROUND = 20

    private val winnerComments = listOf(
        "Trop rapide pour ce monde ⚡", "Un génie caché ? 🧠", "Google, c'est toi ? 🤔", 
        "La foudre a frappé ! ⚡", "C'était trop facile, non ? 😎", "Futur gagnant détecté 🏆"
    )
    
    private val streakComments = listOf(
        "IL EST EN FEU !!! 🔥🔥🔥", "Quelqu'un a un extincteur ? 🚒", "Invincible ! 🛡️"
    )

    private val loserComments = listOf(
        "Dort debout... 😴", "Internet a coupé ? 🌐", "Oups, j'ai glissé... 🍌"
    )

    @Scheduled(fixedRate = 100)
    fun tick() {
        val currentTime = timer.addAndGet(-100)
        
        // Clean old online players (last seen > 10s)
        val now = System.currentTimeMillis()
        onlinePlayers.entries.removeIf { it.value < now - 10000 }

        if (currentTime <= 0) {
            transitionPhase()
        } else if (currentTime % 1000 == 0) {
            broadcastState()
        }
    }

    private fun transitionPhase() {
        when (phase) {
            GamePhase.INTERMISSION -> startQuestionPhase()
            GamePhase.QUESTION -> startRevealPhase()
            GamePhase.REVEAL -> {
                if (currentQuestionNumber >= QUESTIONS_PER_ROUND) startPodiumPhase() else startIntermissionPhase()
            }
            GamePhase.PODIUM -> {
                resetRound()
                startIntermissionPhase()
            }
        }
    }

    private fun startQuestionPhase() {
        val totalQuestions = questionRepository.count()
        if (usedQuestionIds.size >= totalQuestions && totalQuestions > 0) usedQuestionIds.clear()

        currentQuestion = if (usedQuestionIds.isEmpty()) questionRepository.findRandomQuestion() else questionRepository.findRandomQuestionNotUsed(usedQuestionIds)
        if (currentQuestion == null) return

        currentQuestion?.id?.let { usedQuestionIds.add(it) }
        currentQuestionNumber++
        phase = GamePhase.QUESTION
        timer.set(15000)
        answeredUsers.clear()
        broadcastState()
    }

    private fun startRevealPhase() {
        playerStreaks.keys.forEach { if (!answeredUsers.contains(it)) { playerStreaks[it] = 0; playerComments[it] = loserComments.random() } }
        phase = GamePhase.REVEAL
        timer.set(5000)
        broadcastState()
    }

    private fun startIntermissionPhase() {
        phase = GamePhase.INTERMISSION
        timer.set(3000)
        broadcastState()
    }

    private fun startPodiumPhase() {
        phase = GamePhase.PODIUM
        timer.set(60000)
        broadcastState()
    }

    private fun resetRound() {
        currentQuestionNumber = 0
        redisTemplate.delete(LEADERBOARD_KEY)
        playerStreaks.clear()
        playerComments.clear()
        messagingTemplate.convertAndSend("/topic/chat", ChatMessageDto("SYSTÈME", "Nouvelle manche ! Les scores ont été réinitialisés."))
    }

    private fun broadcastState() {
        val state = GameStateDto(
            phase = phase,
            remainingTime = timer.get() / 1000,
            question = currentQuestion?.let { QuestionDto(it.id!!, it.content, it.category) },
            correctAnswers = if (phase == GamePhase.REVEAL || phase == GamePhase.INTERMISSION) currentQuestion?.correctAnswers else null,
            leaderboard = getTopPlayers(),
            currentQuestionNumber = currentQuestionNumber,
            totalQuestionsInRound = QUESTIONS_PER_ROUND
        )
        messagingTemplate.convertAndSend("/topic/game", state)
    }

    private fun getTopPlayers(): List<PlayerScoreDto> {
        val scores = redisTemplate.opsForZSet().reverseRangeWithScores(LEADERBOARD_KEY, 0, 9)
        return scores?.map { 
            val pName = it.value ?: "Anonyme"
            val xp = redisTemplate.opsForHash<String, String>().get(XP_KEY, pName)?.toLong() ?: 0L
            val level = (xp / 1000).toInt() + 1
            PlayerScoreDto(
                username = pName,
                points = it.score?.toLong() ?: 0L,
                streak = playerStreaks[pName] ?: 0,
                lastComment = playerComments[pName],
                isOnline = onlinePlayers.containsKey(pName),
                xp = xp,
                level = level,
                title = getTitleForLevel(level)
            )
        } ?: emptyList()
    }

    private fun getTitleForLevel(level: Int) = when {
        level >= 50 -> "Maître Trivia 🧙‍♂️"
        level >= 25 -> "Expert 🧠"
        level >= 10 -> "Savant 📚"
        else -> "Novice 🌱"
    }

    fun handleAnswer(username: String, answer: String): Pair<Int, Int> {
        updatePing(username)
        if (phase != GamePhase.QUESTION || answeredUsers.contains(username)) return Pair(0, playerStreaks[username] ?: 0)

        val question = currentQuestion ?: return Pair(0, 0)
        if (question.correctAnswers.any { normalize(it) == normalize(answer) }) {
            val speedBonus = if (timer.get() > 12000) 5 else 0
            val basePoints = when (answeredUsers.size) { 0 -> 30.0; 1 -> 20.0; else -> 10.0 }
            
            val newStreak = (playerStreaks[username] ?: 0) + 1
            playerStreaks[username] = newStreak
            playerComments[username] = if (newStreak >= 3) streakComments.random() else winnerComments.random()

            val multiplier = if (newStreak >= 3) 1.5 else 1.0
            val points = ((basePoints + speedBonus) * multiplier).toInt()
            
            redisTemplate.opsForZSet().incrementScore(LEADERBOARD_KEY, username, points.toDouble())
            redisTemplate.opsForHash<String, String>().increment(XP_KEY, username, points.toLong())
            answeredUsers.add(username)
            
            val bonusMsg = if (speedBonus > 0) " (+5 Bonus Éclair ⚡)" else ""
            messagingTemplate.convertAndSend("/topic/chat", ChatMessageDto("SYSTÈME", "$username a trouvé la bonne réponse (+${points} pts)$bonusMsg !"))
            
            return Pair(points, newStreak)
        } else {
            messagingTemplate.convertAndSend("/topic/chat", ChatMessageDto("SYSTÈME", "$username a tenté une réponse... mais c'est raté ! ❌"))
        }
        return Pair(0, playerStreaks[username] ?: 0)
    }

    fun handleReport(request: ReportRequest) {
        val count = redisTemplate.opsForValue().increment("report:limit:${request.username}") ?: 1
        if (count == 1L) redisTemplate.expire("report:limit:${request.username}", java.time.Duration.ofMinutes(5))
        if (count > 3) return // Anti-abuse

        redisTemplate.opsForList().rightPush(REPORTS_KEY, "QID:${request.questionId} | User:${request.username} | Reason:${request.reason}")
    }

    fun updatePing(username: String) { onlinePlayers[username] = System.currentTimeMillis() }

    fun clearScores() { redisTemplate.delete(LEADERBOARD_KEY); playerStreaks.clear(); playerComments.clear() }

    fun getUserStats(username: String): UserStatsDto {
        val points = redisTemplate.opsForZSet().score(LEADERBOARD_KEY, username)?.toInt() ?: 0
        val xp = redisTemplate.opsForHash<String, String>().get(XP_KEY, username)?.toLong() ?: 0L
        return UserStatsDto(username, points, playerStreaks[username] ?: 0, (redisTemplate.opsForZSet().reverseRank(LEADERBOARD_KEY, username)?.toInt() ?: -1) + 1)
    }

    private fun normalize(str: String): String {
        var n = Normalizer.normalize(str, Normalizer.Form.NFD).replace("\\p{InCombiningDiacriticalMarks}".toRegex(), "").lowercase().trim()
        listOf("le ", "la ", "les ", "un ", "une ", "des ", "du ", "de ", "d'", "l'").forEach { if (n.startsWith(it)) n = n.removePrefix(it) }
        return n.replace(Regex("[^a-z0-9]"), "").trim()
    }
}
