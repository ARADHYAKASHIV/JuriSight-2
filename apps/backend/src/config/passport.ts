import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { prisma } from '@/lib/clients'
import { logger } from '@/utils/logger'
import { UserRole } from '@/shared'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

const googleCredentialsSet =
  GOOGLE_CLIENT_ID.length > 10 &&
  !GOOGLE_CLIENT_ID.startsWith('<') &&
  GOOGLE_CLIENT_SECRET.length > 10 &&
  !GOOGLE_CLIENT_SECRET.startsWith('<')

if (!googleCredentialsSet) {
  logger.warn('Google OAuth credentials not configured or are placeholders. Google Sign-In will be unavailable.')
}

if (googleCredentialsSet) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${BACKEND_URL}/api/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value
          if (!email) {
            return done(new Error('No email returned from Google'), undefined)
          }

          // Upsert: find by googleId or email, then link/create
          let user = await prisma.user.findFirst({
            where: { OR: [{ googleId: profile.id }, { email }] },
          })

          if (user) {
            // Link existing email-only account to Google
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                googleId: profile.id,
                name: user.name ?? profile.displayName,
                avatar: user.avatar ?? profile.photos?.[0]?.value,
              },
            })
          } else {
            user = await prisma.user.create({
              data: {
                email,
                googleId: profile.id,
                name: profile.displayName,
                avatar: profile.photos?.[0]?.value,
                role: UserRole.ANALYST,
              },
            })
          }

          return done(null, user)
        } catch (err) {
          logger.error('Google OAuth strategy error', err)
          return done(err as Error, undefined)
        }
      }
    )
  )
}

// Minimal session serialization (stateless JWT flow — only used transiently)
passport.serializeUser((user: any, done) => done(null, user.id))
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } })
    done(null, user)
  } catch (err) {
    done(err)
  }
})

export default passport
