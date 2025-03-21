import React from 'react';
import { ToolType } from './App';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow as syntaxTheme } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ResultsProps {
  tool: ToolType;
  data: any;
}

const Results: React.FC<ResultsProps> = ({ tool, data }) => {
  // Отображение результатов анализа дизайна
  const renderAnalysisResults = () => {
    const { issues = [], recommendations = [], score } = data;
    
    return (
      <div className="results__analysis">
        {score !== undefined && (
          <div className="results__score">
            <span className="results__score-label">Overall Score:</span>
            <span className="results__score-value">{score}/10</span>
          </div>
        )}
        
        {issues.length > 0 && (
          <div className="results__issues">
            <h3>Issues</h3>
            <ul>
              {issues.map((issue: any, index: number) => (
                <li key={index} className={`results__issue results__issue--${issue.severity || 'medium'}`}>
                  <strong>{issue.element || 'General'}: </strong>
                  {issue.issue}
                  {issue.recommendation && (
                    <p className="results__recommendation">Suggestion: {issue.recommendation}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {recommendations.length > 0 && (
          <div className="results__recommendations">
            <h3>Recommendations</h3>
            <ul>
              {recommendations.map((recommendation: string, index: number) => (
                <li key={index}>{recommendation}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Отображение сгенерированного кода
  const renderCodeResults = () => {
    const { code = '', language = 'javascript' } = data;
    
    return (
      <div className="results__code">
        <SyntaxHighlighter language={language} style={syntaxTheme}>
          {code}
        </SyntaxHighlighter>
        
        <div className="results__actions">
          <button 
            className="button button-outline"
            onClick={() => navigator.clipboard.writeText(code)}
          >
            Copy Code
          </button>
        </div>
      </div>
    );
  };

  // Заглушки для результатов других инструментов
  const renderResponsiveResults = () => (
    <div className="results__placeholder">
      <p>Results for Responsive Layout will be displayed here.</p>
    </div>
  );

  const renderVariantsResults = () => (
    <div className="results__placeholder">
      <p>Results for Component Variants will be displayed here.</p>
    </div>
  );

  // Выбор отображения в зависимости от инструмента
  const renderResults = () => {
    switch (tool) {
      case 'analyze':
        return renderAnalysisResults();
      case 'code':
        return renderCodeResults();
      case 'responsive':
        return renderResponsiveResults();
      case 'variants':
        return renderVariantsResults();
      default:
        return <p>No results available</p>;
    }
  };

  return (
    <div className="results">
      <h2 className="results__title">Results</h2>
      {renderResults()}
    </div>
  );
};

export default Results; 