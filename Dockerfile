FROM globe.jfrog.io/hmd-docker-virtual/node:22-alpine

RUN addgroup -g 1729 appgroup \
    && adduser -u 1729 -G appgroup -s /bin/sh -D appuser

WORKDIR /home/appuser/app

COPY --chown=appuser:appgroup package.json package-lock.json .npmrc ./

RUN npm i --ignore-scripts --omit=dev

COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 8080

CMD ["node", "src/index.js"]