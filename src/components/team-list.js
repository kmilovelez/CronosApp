import React from 'react';

const TeamList = ({ teams }) => {
    if (!teams || teams.length === 0) {
        return (
            <div className="team-list">
                <h2>👥 Equipos Técnicos</h2>
                <p className="empty-state">No hay equipos registrados.</p>
            </div>
        );
    }

    return (
        <div className="team-list">
            <h2>👥 Equipos Técnicos</h2>
            <ul className="team-items">
                {teams.map((team, index) => (
                    <li key={index} className="team-item">
                        <span className="team-name">{team.name}</span>
                        <span className="team-members">{team.members} miembros</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TeamList;