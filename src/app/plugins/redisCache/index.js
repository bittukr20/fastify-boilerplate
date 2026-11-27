const fp = require("fastify-plugin");
const fastifyRedis = require("@fastify/redis");

// Registers @fastify/redis from env config and adds small cache helpers on top.
const redisCachePlugin = async fastify => {
  const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = fastify.config;
  await fastify.register(fastifyRedis, {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD
  });

  const { redis } = fastify;

  function setValue({ key, value, ttlInSeconds }) {
    return redis.set(key, value, "EX", ttlInSeconds);
  }

  function getValue({ key }) {
    return redis.get(key);
  }

  function deleteValues({ keys }) {
    return redis.del(...keys);
  }

  fastify.decorate("redisCache", { setValue, getValue, deleteValues });
};

module.exports = fp(redisCachePlugin);
