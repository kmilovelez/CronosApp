import React from 'react';

const ReportView = ({ reports }) => {
    return (
        <div className="report-view">
            <h2>📊 Informe de Tiempos</h2>
            {!reports || reports.length === 0 ? (
                <p className="empty-state">No hay registros aún. Guarda tu primera entrada de tiempo.</p>
            ) : (
                <table className="report-table">
                    <thead>
                        <tr>
                            <th>Equipo</th>
                            <th>Horas</th>
                            <th>Fecha</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((report, index) => (
                            <tr key={index}>
                                <td>{report.team}</td>
                                <td>{report.hours}</td>
                                <td>{report.date}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ReportView;