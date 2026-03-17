FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install --production
EXPOSE 5006
CMD ["node", "app.js"]
