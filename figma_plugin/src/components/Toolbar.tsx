import React from 'react';
import { ToolType } from './App';

interface ToolbarProps {
  activeTool: ToolType;
  onToolSelect: (tool: ToolType) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onToolSelect }) => {
  // Список инструментов с названиями и иконками
  const tools = [
    { 
      id: 'analyze', 
      name: 'Analyze Design',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 3H8C9.06087 3 10.0783 3.42143 10.8284 4.17157C11.5786 4.92172 12 5.93913 12 7V21C12 19.9391 11.5786 18.9217 10.8284 18.1716C10.0783 17.4214 9.06087 17 8 17H2V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M22 3H16C14.9391 3 13.9217 3.42143 13.1716 4.17157C12.4214 4.92172 12 5.93913 12 7V21C12 19.9391 12.4214 18.9217 13.1716 18.1716C13.9217 17.4214 14.9391 17 16 17H22V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      id: 'code', 
      name: 'Generate Code',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 18L22 12L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 6L2 12L8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      id: 'responsive', 
      name: 'Responsive Layout',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 21H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 17V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 7V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 17H19C20.1046 17 21 16.1046 21 15V8C21 6.89543 20.1046 6 19 6H5C3.89543 6 3 6.89543 3 8V15C3 16.1046 3.89543 17 5 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      id: 'variants', 
      name: 'Create Variants',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 2H7C5.89543 2 5 2.89543 5 4V20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 21.1046 19 20V4C19 2.89543 18.1046 2 17 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 18H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  ] as const;

  return (
    <div className="toolbar">
      {tools.map((tool) => (
        <button
          key={tool.id}
          className={`toolbar__button ${activeTool === tool.id ? 'toolbar__button--active' : ''}`}
          onClick={() => onToolSelect(tool.id as ToolType)}
          title={tool.name}
          aria-label={tool.name}
        >
          <span className="toolbar__icon">{tool.icon}</span>
          <span className="toolbar__text">{tool.name}</span>
        </button>
      ))}
    </div>
  );
};

export default Toolbar; 