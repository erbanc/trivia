package com.trivia.repository

import com.trivia.domain.AppUser
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface UserRepository : JpaRepository<AppUser, Long> {
    fun findByUsername(username: String): AppUser?
}
