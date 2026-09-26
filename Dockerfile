FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY . .
RUN mkdir -p server/covers
VOLUME ["/app/server-data"]
ENV KHO_DATA_DIR=/app/server-data
EXPOSE 8787
CMD ["node","server/server.js"]
