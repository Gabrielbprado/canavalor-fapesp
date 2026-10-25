import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { Cabecalho } from '../components/Cabecalho';
import { PainelAuditoria } from '../components/PainelAuditoria';
import { ProvedorEstudo } from '../components/estado';
import './globals.css';

// Fontes auto-hospedadas pelo Next: nenhuma requisição de rede em execução,
// o que importa porque a demonstração precisa rodar sem internet.
const display = Fraunces({
  subsets: ['latin'],
  variable: '--fonte-display',
  axes: ['SOFT', 'WONK', 'opsz'],
  display: 'swap',
});

const corpo = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--fonte-corpo',
  display: 'swap',
});

const dados = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--fonte-dados',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CanaValor — da perda física à remuneração perdida',
  description:
    'Protótipo funcional: quantificação de perdas na colheita mecanizada por visão computacional, conversão em ATR e em reais pelo CONSECANA-SP, e projeção da remuneração sob incerteza.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${corpo.variable} ${dados.variable}`}>
      <body className="min-h-screen antialiased">
        <ProvedorEstudo>
          <Cabecalho />
          <main className="mx-auto w-full max-w-[1500px] px-5 pb-24 pt-6 lg:px-8">
            {children}
          </main>
          <PainelAuditoria />
        </ProvedorEstudo>
      </body>
    </html>
  );
}
