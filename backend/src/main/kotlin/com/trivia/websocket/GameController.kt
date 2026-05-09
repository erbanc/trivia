package com.trivia.websocket

import com.trivia.dto.AnswerRequest
import com.trivia.dto.AnswerResponse
import com.trivia.dto.ChatMessageDto
import com.trivia.service.GameService
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.stereotype.Controller

@Controller
class GameController(
    private val gameService: GameService,
    private val messagingTemplate: SimpMessagingTemplate
) {

    @MessageMapping("/answer")
    @SendToUser("/topic/answer-feedback")
    fun receiveAnswer(request: AnswerRequest): AnswerResponse {
        val (points, streak) = gameService.handleAnswer(request.username, request.answer)
        return AnswerResponse(
            correct = points > 0,
            pointsEarned = points,
            submittedAnswer = if (points > 0) request.answer else null,
            currentStreak = streak
        )
    }

    @MessageMapping("/chat")
    fun receiveChat(message: ChatMessageDto) {
        messagingTemplate.convertAndSend("/topic/chat", message)
    }

    @MessageMapping("/reaction")
    fun receiveReaction(reaction: com.trivia.dto.ReactionDto) {
        messagingTemplate.convertAndSend("/topic/reactions", reaction)
    }

    @MessageMapping("/report")
    fun receiveReport(report: com.trivia.dto.ReportRequest) {
        gameService.handleReport(report)
    }

    @MessageMapping("/ping")
    fun receivePing(username: String) {
        gameService.updatePing(username)
    }

    @MessageMapping("/stats")
    @SendToUser("/topic/stats-feedback")
    fun getStats(username: String): com.trivia.dto.UserStatsDto {
        return gameService.getUserStats(username)
    }
}
