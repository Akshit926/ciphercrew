import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code2, Database, GraduationCap, LayoutGrid, Wrench } from 'lucide-react';
import { PageHeader, fadeUp } from '../components/ui';

const teamMembers = [
  {
    name: 'Dhruv Vaswani',
    role: 'Full Stack Engineer',
    shortBio: 'Architected the React interface and core Python EDI tokenization flows.',
    icon: Code2,
    education: '2nd Year AIML Student, PCCOE',
    focus: 'Owned frontend architecture, interaction design, and product direction.',
    projectRole: 'Connected the experience across parser UI, page structure, and end-to-end workflow polish.',
  },
  {
    name: 'Akshit Agrawal',
    role: 'Frontend Developer',
    shortBio: 'Built the semantic visualization patterns, transitions, and navigation system.',
    icon: LayoutGrid,
    education: '2nd Year Engineering Student, PCCOE',
    focus: 'Focused on UI behavior, page transitions, and clean semantic rendering.',
    projectRole: 'Led important frontend implementation details for claim visualization and motion.',
  },
  {
    name: 'Vitthal Humbe',
    role: 'Backend Developer',
    shortBio: 'Engineered the FastAPI parsing pipeline and Groq-backed AI integration.',
    icon: Wrench,
    education: '2nd Year Engineering Student, PCCOE',
    focus: 'Worked on parser APIs, backend processing, and AI response integration.',
    projectRole: 'Built the backend logic powering file parsing, validation flow, and model-assisted chat.',
  },
  {
    name: 'Avinash Pawar',
    role: 'Backend Developer & Data Engineer',
    shortBio: 'Designed HIPAA validation mappings and supported backend logic for parser output quality.',
    icon: Database,
    education: '2nd Year Engineering Student, PCCOE',
    focus: 'Focused on healthcare transaction logic, backend validation flows, and data interpretation.',
    projectRole: 'Strengthened parser accuracy by shaping semantic rules while also supporting backend development.',
  },
];

const getInitials = (name) => name.split(' ').map((part) => part[0]).join('');

const cardTransition = { duration: 0.55, ease: [0.22, 1, 0.36, 1] };

const FlipCard = ({ member, index, isActive, onToggle }) => {
  const { name, role, shortBio, icon: Icon, education, focus, projectRole } = member;

  return (
    <motion.button
      type="button"
      key={name}
      {...fadeUp}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      onClick={onToggle}
      className="group relative h-[360px] w-full text-left [perspective:1600px] sm:h-[380px]"
    >
      <motion.div
        animate={{ rotateY: isActive ? 180 : 0 }}
        transition={cardTransition}
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className="absolute inset-0 flex flex-col rounded-[24px] border border-[var(--border-default)] bg-[var(--bg-surface-strong)] p-6 shadow-[var(--shadow-sm)]"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[color:rgba(15,108,189,0.12)] text-lg font-extrabold text-primary">
              {getInitials(name)}
            </div>
            <div className="rounded-2xl bg-[var(--bg-base)] p-3 text-[var(--text-secondary)] transition group-hover:text-primary">
              <Icon className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{name}</h2>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{role}</p>
            <p className="pt-1 text-sm leading-6 text-[var(--text-secondary)]">{shortBio}</p>
          </div>

          <div className="mt-auto pt-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
              <GraduationCap className="h-3.5 w-3.5" />
              Tap for details
            </span>
          </div>
        </div>

        <div
          className="absolute inset-0 flex flex-col overflow-hidden rounded-[24px] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(15,108,189,0.1),rgba(255,255,255,0.02))] p-5 shadow-[var(--shadow-md)] sm:p-6"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Member Detail</p>
              <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">{name}</h3>
            </div>
            <div className="rounded-2xl bg-[color:rgba(15,108,189,0.12)] p-3 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 text-sm leading-6">
            <div className="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface-strong)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Education</p>
              <p className="mt-1 font-semibold text-[var(--text-primary)]">{education}</p>
            </div>
            <div className="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface-strong)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Focus</p>
              <p className="mt-1 text-[var(--text-secondary)]">{focus}</p>
            </div>
            <div className="rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface-strong)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">Project Role</p>
              <p className="mt-1 text-[var(--text-secondary)]">{projectRole}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.button>
  );
};

const Team = () => {
  const [activeCard, setActiveCard] = useState(null);

  return (
    <div className="page-shell space-y-6">
      <section className="glass-panel-strong p-6 sm:p-8 lg:p-10">
        <PageHeader
          eyebrow="Team"
          title="The builders behind the ClaimCraft experience."
          description="Click a team member to flip the card and see more about their background, project contribution, and role in building the platform."
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {teamMembers.map((member, index) => (
          <FlipCard
            key={member.name}
            member={member}
            index={index}
            isActive={activeCard === member.name}
            onToggle={() => setActiveCard((prev) => (prev === member.name ? null : member.name))}
          />
        ))}
      </section>
    </div>
  );
};

export default Team;
