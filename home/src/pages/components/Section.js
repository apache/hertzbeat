import React from 'react'

export default function Section({children }) {
    return (
        <section style={{padding: '4rem 0', width: '100%' }}>
            <div className="container">
                <div className="row">
                    {children}
                </div>
            </div>
        </section>
    )
}

