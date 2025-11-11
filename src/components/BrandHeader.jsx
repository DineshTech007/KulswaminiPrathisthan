import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/family-tree.css';

const BrandHeader = ({ title = 'कुलस्वामिनी प्रतिष्ठान', icon = '', right = null }) => {
  return (
    <header className="tree-header">
      <div style={{display:'flex', alignItems:'center', gap:12}}>
        {icon ? (
          <img
            src={icon}
            alt="icon"
            style={{
              width: 48,
              height: 48,
              verticalAlign: 'middle',
              borderRadius: 10,
              objectFit: 'cover',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
          />
        ) : null}
        <h1 style={{margin:0, fontSize:32, fontWeight:800}}>
          <Link to="/" style={{textDecoration:'none', color:'#1e293b'}}>{title}</Link>
        </h1>
      </div>
      <div>
        {right}
      </div>
    </header>
  );
};

export default BrandHeader;
