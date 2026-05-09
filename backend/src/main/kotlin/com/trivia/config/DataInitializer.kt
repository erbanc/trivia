package com.trivia.config

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.trivia.domain.Question
import com.trivia.repository.QuestionRepository
import org.springframework.boot.CommandLineRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.io.ClassPathResource

@JsonIgnoreProperties(ignoreUnknown = true)
data class RawQuestion(
    val question: String,
    val reponses: List<String>,
    val categorie: String? = null
)

@Configuration
class DataInitializer(private val gameService: com.trivia.service.GameService) {

    @Bean
    fun seedData(questionRepository: QuestionRepository) = CommandLineRunner {
        // Reset scores on startup
        gameService.clearScores()
        
        // Clear all and re-seed only curated questions
        questionRepository.deleteAll()
        val mapper = jacksonObjectMapper()
        seedFile(questionRepository, mapper, "curated_questions.json")
        seedFile(questionRepository, mapper, "curated_questions_part2.json")
        seedFile(questionRepository, mapper, "curated_questions_part3.json")
        seedFile(questionRepository, mapper, "curated_questions_part4.json")
        seedFile(questionRepository, mapper, "curated_questions_part5.json")
        println("Seeding curated questions complete. Total questions: ${questionRepository.count()}")
    }

    private fun seedFile(repository: QuestionRepository, mapper: com.fasterxml.jackson.databind.ObjectMapper, fileName: String) {
        try {
            val resource = ClassPathResource(fileName)
            if (!resource.exists()) return
            
            val rawQuestions: List<RawQuestion> = mapper.readValue(resource.inputStream)
            val questions = rawQuestions.map {
                Question(
                    content = it.question,
                    correctAnswers = it.reponses,
                    category = it.categorie
                )
            }
            repository.saveAll(questions)
            println("Seeded ${questions.size} from $fileName")
        } catch (e: Exception) {
            println("Failed to seed from $fileName: ${e.message}")
        }
    }
}
