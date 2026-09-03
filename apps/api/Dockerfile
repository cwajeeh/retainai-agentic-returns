FROM node:22-slim AS build
WORKDIR /repo
COPY package.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm install --workspace=packages/shared --workspace=apps/api --include-workspace-root
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/api

FROM node:22-slim
WORKDIR /app
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/packages/shared ./node_modules/@retainai/shared
EXPOSE 3001
CMD ["node", "dist/index.js"]
