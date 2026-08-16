import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { weatherInput, weatherRouter } from "./routers/weather";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  weather: router({
    forecast: publicProcedure.input(weatherInput.forecast).query(({ input }) => weatherRouter.forecast({ input })),
    searchLocations: publicProcedure.input(weatherInput.searchLocations).query(({ input }) => weatherRouter.searchLocations({ input })),
    news: publicProcedure.query(() => weatherRouter.news()),
    officialAlerts: publicProcedure.input(weatherInput.officialAlerts).query(({ input }) => weatherRouter.officialAlerts({ input })),
  }),
});

export type AppRouter = typeof appRouter;
