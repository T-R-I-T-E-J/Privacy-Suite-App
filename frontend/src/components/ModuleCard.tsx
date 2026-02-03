import React from 'react';

interface ModuleCardProps {
    title: string;
    description: string;
    status: 'active' | 'inactive' | 'loading';
    onClick?: () => void;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({ title, description, status, onClick }) => {
    return (
        <div className={`module-card ${status}`} onClick={onClick} style={{ border: '1px solid #ccc', padding: '1rem', margin: '0.5rem' }}>
            <h3>{title}</h3>
            <p>{description}</p>
            <span>Status: {status}</span>
        </div>
    );
};
