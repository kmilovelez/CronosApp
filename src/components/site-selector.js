import React, { useState } from 'react';

const SiteSelector = ({ sites, onSelect }) => {
    const [selectedId, setSelectedId] = useState(null);

    const handleSelect = (site) => {
        setSelectedId(site.id);
        onSelect(site);
    };

    if (!sites || sites.length === 0) {
        return (
            <div className="site-selector">
                <h2>📍 Seleccionar Sede</h2>
                <p className="empty-state">No hay sedes disponibles.</p>
            </div>
        );
    }

    return (
        <div className="site-selector">
            <h2>📍 Seleccionar Sede</h2>
            <ul className="site-items">
                {sites.map((site) => (
                    <li
                        key={site.id}
                        className={`site-item ${selectedId === site.id ? 'site-item-active' : ''}`}
                        onClick={() => handleSelect(site)}
                    >
                        {site.name}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SiteSelector;