import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: '/auth/signin',
    },



    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text", placeholder: "cooluser" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { username: credentials.username }
                });

                if (!user) return null;

                const passwordMatch = await compare(credentials.password, user.password);

                if (!passwordMatch) return null;

                return {
                    id: user.id,
                    name: user.username,
                    email: user.email,
                    role: user.role, // Add role here
                };
            }
        })
    ],
    callbacks: {
        async session({ session, token }) {
            if (session.user) {
                // Should use types augmentation, but for now ensure ID is passed
                // @ts-ignore
                session.user.id = token.id as string || token.sub as string;
                // @ts-ignore
                session.user.role = token.role as string;
                // session.user.image can be used as fallback if needed, but 'id' is better standard
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                // @ts-ignore
                token.role = user.role;
            }
            return token;
        }
    }
};
