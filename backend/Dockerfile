# --- Étape de Build ---
FROM gradle:8.7.0-jdk17 AS build
WORKDIR /home/gradle/src

# Cache des dépendances Gradle
COPY build.gradle.kts settings.gradle.kts ./
RUN gradle build --no-daemon > /dev/null 2>&1 || true

# Build du code
COPY . .
RUN gradle build --no-daemon -x test

# --- Étape d'Exécution ---
FROM eclipse-temurin:17-jre-alpine
RUN mkdir /app
COPY --from=build /home/gradle/src/build/libs/*.jar /app/trivia-backend.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Xmx512m", "-jar", "/app/trivia-backend.jar"]
