import React from 'react';
import Badge from './Badge';

export default function ProjectCard({ project, currentUserId, onClick }) {
    const isGroup = project.type === 'group';
    const isOwner = (project.ownerId?._id || project.ownerId) === currentUserId;

    return (
        <div 
            onClick={onClick}
            className="group relative h-48 flex flex-col bg-[var(--theme-bg)]/60 backdrop-blur-xl rounded-[2rem] p-6 cursor-pointer overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_var(--theme-accent)]"
        >
            {/* The Border Gradient Hack (Creates a glowing border on hover) */}
            <div className="absolute inset-0 rounded-[2rem] border-2 border-[var(--theme-text)]/5 group-hover:border-transparent transition-colors duration-500"></div>
            <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 bg-gradient-to-br from-[var(--theme-accent)]/50 via-transparent to-[var(--theme-accent)]/20 [mask-image:linear-gradient(white,white)] p-[2px] -z-10 transition-opacity duration-500">
                <div className="absolute inset-0 bg-[var(--theme-bg)] rounded-[calc(2rem-2px)] h-full w-full"></div>
            </div>

            {/* Header: Title & Badges */}
            <div className="flex justify-between items-start mb-2 relative z-10">
                <h3 className="text-xl font-extrabold text-[var(--theme-text)] group-hover:text-[var(--theme-accent)] transition-colors truncate pr-4">
                    {project.name}
                </h3>
                <Badge variant={isGroup ? 'purple' : 'emerald'}>
                    {project.type}
                </Badge>
            </div>

            {/* Description */}
            <p className="text-sm text-[var(--theme-text)]/50 font-medium line-clamp-2 mb-4 relative z-10 leading-relaxed">
                {project.description || "No description provided."}
            </p>

            {/* Bottom Footer Section */}
            <div className="mt-auto flex items-center justify-between relative z-10 pt-4 border-t border-[var(--theme-text)]/5">
                <div className="flex items-center gap-3">
                    <Badge variant="neutral">
                        {isOwner ? 'Owner' : 'Collab'}
                    </Badge>
                    {isGroup && (
                        <span className="flex items-center gap-1 text-xs font-bold text-[var(--theme-text)]/40">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            {project.collaborators?.length ?? 0}
                        </span>
                    )}
                </div>
                <span className="text-[11px] font-bold text-[var(--theme-text)]/30 uppercase tracking-wider">
                    {new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
            </div>
        </div>
    );
}