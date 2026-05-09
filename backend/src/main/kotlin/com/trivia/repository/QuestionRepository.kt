package com.trivia.repository

import com.trivia.domain.Question
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface QuestionRepository : JpaRepository<Question, Long> {
    @Query("SELECT q FROM Question q ORDER BY RANDOM() LIMIT 1")
    fun findRandomQuestion(): Question?

    @Query("SELECT q FROM Question q WHERE q.id NOT IN :usedIds ORDER BY RANDOM() LIMIT 1")
    fun findRandomQuestionNotUsed(usedIds: Set<Long>): Question?
}
