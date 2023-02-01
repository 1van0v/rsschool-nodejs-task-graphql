import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import { createProfileBodySchema, changeProfileBodySchema } from './schema';
import type { ProfileEntity } from '../../utils/DB/entities/DBProfiles';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<ProfileEntity[]> {
    return fastify.db.profiles.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity | null> {
      const profile = await fastify.db.profiles.findOne({
        key: 'id',
        equals: request.params.id,
      });

      if (!profile) {
        reply.notFound();
      }

      return profile;
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createProfileBodySchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity | void> {
      const userHasProfile = fastify.db.profiles.findOne({
        key: 'userId',
        equals: request.body.userId,
      });

      const isValidMemberType = fastify.db.memberTypes.findOne({
        key: 'id',
        equals: request.body.memberTypeId,
      });

      if ((await userHasProfile) || !(await isValidMemberType)) {
        return reply.badRequest();
      }

      const created = await fastify.db.profiles.create(request.body);

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
    async function (request, reply): Promise<ProfileEntity | void> {
      try {
        const deleted = await fastify.db.profiles.delete(request.params.id);

        return deleted;
      } catch (e) {
        return reply.badRequest();
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeProfileBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity | void> {
      try {
        const updated = await fastify.db.profiles.change(
          request.params.id,
          request.body
        );

        return updated;
      } catch (e) {
        return reply.badRequest();
      }
    }
  );
};

export default plugin;
