import React from 'react'
import './ModuleCard.css'

interface ModuleCardProps {
    id: string;
    title: string;
    description: string;
    icon: string;
    onClick: () => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ title, description, icon, onClick }) => {
    return (
        <div className="module-card" onClick={onClick}>
            <div className="module-icon">{icon}</div>
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    )
}

export default ModuleCard
