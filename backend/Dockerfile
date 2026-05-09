# --- Étape de Build ---
FROM gradle:8.7.0-jdk17 AS build
COPY --chown=gradle:gradle . /home/gradle/src
WORKDIR /home/gradle/src
RUN gradle build --no-daemon -x test

# --- Étape d'Exécution ---
FROM eclipse-temurin:17-jre-alpine
RUN mkdir /app
COPY --from=build /home/gradle/src/build/libs/*.jar /app/trivia-backend.jar

# On expose le port standard de Spring Boot
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/trivia-backend.jar"]
