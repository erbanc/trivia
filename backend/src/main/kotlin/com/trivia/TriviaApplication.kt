package com.trivia

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class TriviaApplication

fun main(args: Array<String>) {
    runApplication<TriviaApplication>(*args)
}
