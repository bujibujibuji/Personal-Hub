FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /workspace
ENV MAVEN_OPTS="-Xmx384m -XX:MaxMetaspaceSize=192m"
COPY backend/pom.xml ./pom.xml
RUN mvn -q -DskipTests dependency:go-offline
COPY backend/src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S hub && adduser -S hub -G hub && mkdir -p /app/uploads/images /app/uploads/files && chown -R hub:hub /app
COPY --from=build --chown=hub:hub /workspace/target/*.jar /app/app.jar
USER hub
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65 -XX:+UseSerialGC"
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
