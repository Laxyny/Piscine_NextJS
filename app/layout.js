import "../frontend/styles/globals.css";

export const metadata = {
    title: "Chat App",
    description: "Projet Next.js",
};

export default function RootLayout({ children }) {
    return (
        <html lang="fr">
            <body>{children}</body>
        </html>
    );
}
