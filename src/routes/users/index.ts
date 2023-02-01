import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import {
  createUserBodySchema,
  changeUserBodySchema,
  subscribeBodySchema,
} from './schemas';
import type { UserEntity } from '../../utils/DB/entities/DBUsers';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<UserEntity[]> {
    return fastify.db.users.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const user = (await fastify.db.users.findOne({
        key: 'id',
        equals: request.params.id,
      })) as UserEntity;

      if (!user) {
        reply.notFound();
      }

      return user;
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createUserBodySchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const created = await fastify.db.users.create(request.body);

      return created;
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity | void> {
      try {
        const deleted = await fastify.db.users.delete(request.params.id);

        const profile = await fastify.db.profiles.findOne({
          key: 'userId',
          equals: request.params.id,
        });

        if (profile) {
          await fastify.db.profiles.delete(profile.id);
        }

        const posts = await fastify.db.posts.findMany({
          key: 'userId',
          equals: request.params.id,
        });

        const deletedPost = posts.map((i) => fastify.db.posts.delete(i.id));

        const subscribers = await fastify.db.users.findMany({
          inArray: request.params.id,
          key: 'subscribedToUserIds',
        });

        const unsubscribed = subscribers.map((i) =>
          fastify.db.users.change(i.id, {
            subscribedToUserIds: i.subscribedToUserIds.filter(
              (id) => id !== request.params.id
            ),
          })
        );

        await Promise.all([...unsubscribed, ...deletedPost]);

        deleted;
      } catch (e) {
        return reply.badRequest();
      }
    }
  );

  fastify.post(
    '/:id/subscribeTo',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity | void> {
      const toSubscribe = await fastify.db.users.findOne({
        key: 'id',
        equals: request.body.userId,
      });

      if (!toSubscribe) {
        return reply.badRequest();
      }

      const updated = await fastify.db.users.change(request.body.userId, {
        subscribedToUserIds: toSubscribe.subscribedToUserIds.concat(
          request.params.id
        ),
      });

      return updated;
    }
  );

  fastify.post(
    '/:id/unsubscribeFrom',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity | void> {
      const toUnsubscribe = await fastify.db.users.findOne({
        key: 'id',
        equals: request.body.userId,
      });

      if (
        !toUnsubscribe ||
        !toUnsubscribe.subscribedToUserIds.includes(request.params.id)
      ) {
        return reply.badRequest();
      }

      const updated = await fastify.db.users.change(request.body.userId, {
        subscribedToUserIds: toUnsubscribe.subscribedToUserIds.filter(
          (i) => i !== request.params.id
        ),
      });

      return updated;
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeUserBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity | void> {
      try {
        const updated = await fastify.db.users.change(
          request.params.id,
          request.body
        );

        return updated;
      } catch (e) {
        reply.badRequest();
      }
    }
  );
};

export default plugin;
