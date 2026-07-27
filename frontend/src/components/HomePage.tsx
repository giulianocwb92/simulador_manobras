import { Link } from "react-router-dom";

interface HomeCard {
  to: string;
  title: string;
  description: string;
  icon: string;
}

const CARDS: HomeCard[] = [
  {
    to: "/substations",
    title: "Configuração de Subestações",
    description: "Cadastrar e editar a topologia permanente das subestações.",
    icon: "🏗️",
  },
  {
    to: "/manobras",
    title: "Manobras",
    description: "Criar e gravar manobras, editar e gerar PDF.",
    icon: "🔧",
  },
  {
    to: "/manobras",
    title: "Histórico",
    description: "Consultar manobras anteriores, filtrar e clonar.",
    icon: "📋",
  },
];

export function HomePage() {
  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-8 text-2xl font-semibold text-slate-900">Simulador de Manobras</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <span className="text-2xl">{card.icon}</span>
            <h2 className="text-base font-semibold text-slate-900">{card.title}</h2>
            <p className="text-sm text-slate-500">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
