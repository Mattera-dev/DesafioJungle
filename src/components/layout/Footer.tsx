import React, { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Bell, Shield, User } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

export const Footer: React.FC = () => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
      toast({
        title: 'E-mail inválido',
        description:
          'Digite um e-mail válido para receber alertas de lançamentos.',
        variant: 'error',
      });
      return;
    }
    toast({
      title: 'Inscrição realizada',
      description: `Você receberá alertas de lançamentos em ${newsletterEmail}.`,
      variant: 'success',
    });
    setNewsletterEmail('');
  };

  const handleOutOfScopeInfo = (tela: string) => {
    toast({
      title: `Tela ${tela} fora do escopo do desafio`,
    });
  };

  return (
    <footer className="mt-16 max-w-[1280px] mx-auto px-4 sm:px-8 pb-10">
      <div className="bg-[#1F150F] border border-[#3C281B] rounded-lg overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6 sm:p-8 border-b border-[#3C281B]">
          <div className="flex flex-col gap-2.5 sm:border-r sm:border-[#3C281B] sm:pr-5">
            <div className="w-10 h-10 rounded-full bg-[#CF8A49] text-[#130D09] flex items-center justify-center">
              <Shield className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h3 className="text-xs font-bold text-[#F5EFEA]">
              Segurança da carteira
            </h3>
            <p className="text-[11px] text-[#A89688] leading-relaxed">
              Proteja sua carteira e colecione arte digital verificada com
              confiança.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 lg:border-r lg:border-[#3C281B] lg:pr-5">
            <div className="w-10 h-10 rounded-full bg-[#CF8A49] text-[#130D09] flex items-center justify-center">
              <User className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h3 className="text-xs font-bold text-[#F5EFEA]">
              Criadores em destaque
            </h3>
            <p className="text-[11px] text-[#A89688] leading-relaxed">
              Conheça artistas, estúdios e comunidades que moldam a cultura
              digital na rede.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:border-r sm:border-[#3C281B] sm:pr-5">
            <div className="w-10 h-10 rounded-full bg-[#CF8A49] text-[#130D09] flex items-center justify-center">
              <Bell className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h3 className="text-xs font-bold text-[#F5EFEA]">
              Alertas de lançamentos
            </h3>
            <p className="text-[11px] text-[#A89688] leading-relaxed">
              Receba calendários de cunhagem, novidades de listas de acesso e
              análises do mercado.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <h3 className="text-xs font-bold text-[#F5EFEA]">
              Antecipe-se ao próximo lançamento
            </h3>
            <form onSubmit={handleNewsletter} className="flex w-full">
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Seu e-mail para alertas
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="digite seu e-mail..."
                className="flex-1 min-w-0 h-9 px-3 bg-[#2B1D14] border border-[#3C281B] rounded-l text-xs text-[#F5EFEA] placeholder-[#7B695B]"
              />
              <button
                type="submit"
                className="px-4 h-9 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] font-bold text-xs rounded-r transition-colors"
              >
                Enviar
              </button>
            </form>
            <p className="text-[11px] text-[#A89688] leading-relaxed">
              Receba lançamentos selecionados, histórias de criadores e
              novidades do mercado.
            </p>
          </div>
        </div>

        <div className="bg-[#2D1E14] px-6 sm:px-8 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center text-xs border-b border-[#3C281B]">
          <div className="font-extrabold tracking-[0.2em] text-[#F5EFEA]">
            KURIO
          </div>
          <div className="text-[11px] text-[#D7C7B8]">
            Feito para colecionadores, criadores e cultura
          </div>
          <div className="text-[11px] text-[#D7C7B8]">contato@email.com</div>
          <div className="text-[11px] text-[#D7C7B8]">+55 11 4002 8922</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 p-6 sm:p-8 text-xs">
          <div className="flex flex-col gap-2">
            <h4 className="font-bold text-[#F5EFEA] mb-1">Meu perfil</h4>
            <Link
              to="/profile"
              className="text-[#A89688] hover:text-[#CF8A49] text-[11px]"
            >
              Meu perfil
            </Link>
            <Link
              to="/wallets"
              className="text-[#A89688] hover:text-[#CF8A49] text-[11px]"
            >
              Minha coleção
            </Link>
            <button
              type="button"
              onClick={() => handleOutOfScopeInfo('Atividade')}
              className="text-left text-[#A89688] hover:text-[#CF8A49] text-[11px]"
            >
              Atividade
            </button>
            <button
              type="button"
              onClick={() => handleOutOfScopeInfo('Estúdio do criador')}
              className="text-left text-[#A89688] hover:text-[#CF8A49] text-[11px]"
            >
              Estúdio do criador
            </button>
            <Link
              to="/profile"
              className="text-[#A89688] hover:text-[#CF8A49] text-[11px]"
            >
              Lista de interesse
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="font-bold text-[#F5EFEA] mb-1">Central de ajuda</h4>
            <button
              type="button"
              onClick={() => handleOutOfScopeInfo('Central de ajuda')}
              className="text-left text-[#A89688] hover:text-[#CF8A49] text-[11px]"
            >
              Central de ajuda
            </button>
            <button
              type="button"
              onClick={() => handleOutOfScopeInfo('Como comprar NFTs')}
              className="text-left text-[#A89688] hover:text-[#CF8A49] text-[11px]"
            >
              Como comprar NFTs
            </button>
            <Link
              to="/wallets"
              className="text-[#A89688] hover:text-[#CF8A49] text-[11px]"
            >
              Carteira e segurança
            </Link>
            <button
              type="button"
              onClick={() => handleOutOfScopeInfo('Política do mercado')}
              className="text-left text-[#A89688] hover:text-[#CF8A49] text-[11px]"
            >
              Política do mercado
            </button>
            <button
              type="button"
              onClick={() => handleOutOfScopeInfo('Denunciar item')}
              className="text-left text-[#A89688] hover:text-[#CF8A49] text-[11px]"
            >
              Denunciar item
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="font-bold text-[#F5EFEA] mb-1">Coleções</h4>
            {(
              [
                'Arte 3D',
                'Arte digital',
                'Fotografia',
                'Música',
                'Utilidade',
              ] as const
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  navigate({
                    to: '/',
                    search: { categories: cat, page: 1 },
                  })
                }
                className="text-left text-[#A89688] hover:text-[#CF8A49] text-[11px]"
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4 min-w-0">
            <div>
              <h4 className="font-bold text-[#F5EFEA] mb-2">Redes sociais</h4>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'fb', label: 'Facebook', text: 'f' },
                  { id: 'ig', label: 'Instagram', text: 'ig' },
                  { id: 'tw', label: 'Twitter', text: '𝕏' },
                  { id: 'in', label: 'LinkedIn', text: 'in' },
                  { id: 'yt', label: 'YouTube', text: '▶' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={s.label}
                    onClick={() => handleOutOfScopeInfo(s.label)}
                    className="w-7 h-7 rounded border border-[#523827] text-[#CF8A49] hover:bg-[#CF8A49] hover:text-[#130D09] text-[11px] font-bold flex items-center justify-center transition-colors"
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-0">
              <h4 className="font-bold text-[#F5EFEA] mb-2">
                Carteiras compatíveis
              </h4>
              <div className="inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#3C281B] bg-[#18100B] text-[9px] font-bold tracking-wider text-[#CF8A49] max-w-full">
                <span>METAMASK</span>
                <span>•</span>
                <span>WALLETCONNECT</span>
                <span>•</span>
                <span>COINBASE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-[#A89688] mt-6">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  );
};
