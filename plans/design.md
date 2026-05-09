# Projet Trivia - Conception Technique

## 1. Vue d'ensemble
'Trivia' est un jeu de quiz multijoueur en temps réel, inspiré de 'Massive Trivia Quiz'. Tous les joueurs participent à une session globale unique, répondant aux mêmes questions simultanément dans un cycle continu de 15 secondes par question.

## 2. Architecture Technique

### Back-end
- **Langage** : Kotlin
- **Framework** : Spring Boot 3.x
- **Gestion de dépendances** : Gradle (Kotlin DSL)
- **Real-time** : Spring WebSockets (STOMP over SockJS)
- **Base de données persistante** : PostgreSQL (Utilisateurs, Questions, Historique)
- **Base de données temps réel** : Redis (Gestion de l'état du jeu, minuteur synchronisé, cache de session)

### Front-end
- **Framework** : React + TypeScript
- **Stylisation** : Vanilla CSS (pour un contrôle précis des animations et de l'esthétique)
- **Communication** : SockJS + StompJS
- **State Management** : Context API ou simple State (suffisant pour une session globale)

## 3. Modèle de Données

### PostgreSQL
- **User** : `id, username, password_hash, total_points, best_rank, created_at`
- **Question** : `id, content (fr), choices (array), correct_index, category, difficulty`
- **GameResult** : `id, user_id, question_id, is_correct, points_earned, timestamp`

### Redis (Structures Clés)
- `game:current_question` : Hash contenant les infos de la question en cours (sans l'index de réponse).
- `game:phase` : `QUESTION`, `REVEAL`, `INTERMISSION`.
- `game:timer` : Timestamp d'expiration.
- `game:leaderboard` : Sorted Set (ZSET) pour le classement en temps réel de la session.

## 4. Cycle de Jeu (Game Loop)
Le serveur gère une boucle infinie :
1. **Phase Question (15s)** : 
   - Sélection d'une question aléatoire.
   - Diffusion aux clients via `/topic/game`.
   - Les clients affichent le chrono et les choix.
2. **Phase Récupération des Réponses** :
   - Les clients envoient `/app/answer` avec leur choix.
   - Le serveur valide et met à jour le score dans Redis.
3. **Phase Révélation (5s)** :
   - Diffusion de la réponse correcte et du top 10 de la session.
   - Les clients affichent le feedback (vert/rouge) et les points gagnés.
4. **Phase Transition (3s)** :
   - Court délai avant la prochaine question.

## 5. Esthétique & UI
- **Thème** : Moderne, contrasté (Dark Theme par défaut).
- **Animations** :
  - Barre de progression fluide pour le timer de 15s.
  - Transitions de type "slide" entre les questions.
  - Feedback visuel immédiat lors du clic sur une réponse (état "en attente").
- **Langue** : Interface et contenu intégralement en Français.

## 6. Prochaines étapes (Prototype)
1. Initialisation du projet Spring Boot avec Gradle.
2. Configuration de Docker Compose pour PostgreSQL et Redis.
3. Implémentation du moteur de jeu (Game Engine) côté serveur.
4. Création de l'interface React de base avec connexion WebSocket.
