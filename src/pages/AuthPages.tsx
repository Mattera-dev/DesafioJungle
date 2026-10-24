import React from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { AuthFormContent } from '@/components/layout/AuthModal';
import { Compass } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const search = useSearch({ strict: false }) as { returnTo?: string };
  const navigate = useNavigate();

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-12 flex justify-center">
      <AuthFormContent
        initialMode="login"
        returnTo={search.returnTo || '/'}
        onSuccess={() => {
          navigate({ to: (search.returnTo || '/') as any });
        }}
      />
    </main>
  );
};

export const RegisterPage: React.FC = () => {
  const search = useSearch({ strict: false }) as { returnTo?: string };
  const navigate = useNavigate();

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-12 flex justify-center">
      <AuthFormContent
        initialMode="register"
        returnTo={search.returnTo || '/'}
        onSuccess={() => {
          navigate({ to: (search.returnTo || '/') as any });
        }}
      />
    </main>
  );
};

export const NotFoundPage: React.FC = () => {
  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-16 flex justify-center">
      <div
        data-testid="route-not-found"
        className="max-w-md w-full bg-[#1F150F] border border-[#3C281B] rounded-xl p-10 text-center flex flex-col items-center gap-4"
      >
        <Compass className="w-10 h-10 text-[#CF8A49]" />
        <h1 className="text-lg font-extrabold text-[#F5EFEA]">
          404 — Página não encontrada
        </h1>
        <p className="text-xs text-[#A89688] leading-relaxed">
          O endereço que você tentou acessar não existe na Kurio Marketplace.
        </p>
        <Link
          to="/"
          data-testid="not-found-home-link"
          className="mt-2 inline-flex items-center justify-center px-6 h-10 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-extrabold rounded"
        >
          Voltar ao Início
        </Link>
      </div>
    </main>
  );
};

