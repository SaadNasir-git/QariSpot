import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { RowDataPacket } from 'mysql2'
import getDatabaseConnection from "./lib/mysql2"

async function getUserRole(email: string): Promise<string> {
  try {
    const connection = await getDatabaseConnection();
    const [user] = await connection.query<RowDataPacket[]>('SELECT role FROM users WHERE email=?', [email])
    return user.length > 0 ? user[0].role : ''
  } catch (error) {
    console.error('Error checking user role:', error)
    return ''
  }
}

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    const email = token?.email as string
    const path = req.nextUrl.pathname

    if (email) {
      const role = await getUserRole(email)

      if (role === 'admin') {
        return NextResponse.next()
      }

      if (role === 'moderator') {
        if (path === '/dashboard/assign-role') {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
        
        if (path === '/dashboard/api/user/role') {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
        
        return NextResponse.next()
      }

      return NextResponse.redirect(new URL('/', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return !!token
      },
    },
    pages: {
      signIn: "/login",
      error: "/",
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*", "/dashboard/api/:path*"]
}