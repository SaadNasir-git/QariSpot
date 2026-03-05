import getDatabaseConnection from "@/lib/mysql2";
import { RowDataPacket } from 'mysql2'
import NextAuth from "next-auth"
import { getServerSession, NextAuthOptions } from "next-auth"
import GitHubProvider from "next-auth/providers/github"

export const authOptions: NextAuthOptions = {
    providers: [
        GitHubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
        }),
    ],

    secret: process.env.NEXTAUTH_SECRET,

    callbacks: {
        async session({ session, token, user }) {
            if (session.user && user) {
                session.user.name = token.name as string
                session.user.email = token.email as string
                session.user.image = token.picture as string
            }
            return session
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async signIn({ user }) {
            try {
                const db = await getDatabaseConnection()

                const [existingUser] = await db.query<RowDataPacket[]>(
                    'SELECT id FROM users WHERE email = ?',
                    [user.email]
                )

                if (!existingUser || existingUser.length === 0) {
                    await db.query(
                        'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
                        [user.name, user.email, 'viewer']
                    )
                }

                return true
            } catch (error) {
                console.error("Error during sign in:", error)
                return false
            }
        }
    },

    pages: {
        signIn: '/login',
        error: '/auth/error',
    },

    session: {
        strategy: "jwt", // or "database" if using DB
    },
}

const handler = NextAuth(authOptions)

export async function getCurrentUser() {
    const session = await getServerSession(authOptions)
    return session?.user
}

export { handler as GET, handler as POST }