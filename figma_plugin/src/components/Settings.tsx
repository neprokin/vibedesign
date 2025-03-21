import React, { useState, useEffect } from 'react';
import { ToolType } from './App';

interface SettingsProps {
  tool: ToolType;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

// Компонент с настройками для текущего инструмента
const Settings: React.FC<SettingsProps> = ({ tool, onSubmit, isLoading }) => {
  // Базовое состояние для каждого инструмента
  const [settings, setSettings] = useState<any>({
    analyze: {
      types: ['ux-ui', 'accessibility', 'design-system'],
      depth: 'standard',
      format: 'json'
    },
    code: {
      framework: 'react',
      styling: 'tailwind',
      typescript: true,
      responsive: true
    },
    responsive: {
      devices: ['tablet', 'mobile-l', 'mobile-s'],
      strategy: 'stack',
      minTouchTarget: 44,
      preserveProportions: true
    },
    variants: {
      count: 3,
      style: 'minimal',
      colorVariations: true,
      sizeVariations: true,
      description: ''
    }
  });

  // Обработчик изменения настроек
  const handleChange = (category: ToolType, key: string, value: any) => {
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value
      }
    });
  };

  // Обработчик отправки формы
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(settings[tool]);
  };

  // Отображение настроек для анализа дизайна
  const renderAnalyzeSettings = () => (
    <form onSubmit={handleSubmit}>
      <div className="settings__group">
        <label className="settings__label">Analysis Types</label>
        <div className="settings__checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.analyze.types.includes('ux-ui')}
              onChange={(e) => {
                const types = e.target.checked 
                  ? [...settings.analyze.types, 'ux-ui']
                  : settings.analyze.types.filter((t: string) => t !== 'ux-ui');
                handleChange('analyze', 'types', types);
              }}
            />
            UX/UI
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.analyze.types.includes('accessibility')}
              onChange={(e) => {
                const types = e.target.checked 
                  ? [...settings.analyze.types, 'accessibility']
                  : settings.analyze.types.filter((t: string) => t !== 'accessibility');
                handleChange('analyze', 'types', types);
              }}
            />
            Accessibility
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.analyze.types.includes('design-system')}
              onChange={(e) => {
                const types = e.target.checked 
                  ? [...settings.analyze.types, 'design-system']
                  : settings.analyze.types.filter((t: string) => t !== 'design-system');
                handleChange('analyze', 'types', types);
              }}
            />
            Design System Compliance
          </label>
        </div>
      </div>

      <div className="settings__group">
        <label className="settings__label">Analysis Depth</label>
        <select
          value={settings.analyze.depth}
          onChange={(e) => handleChange('analyze', 'depth', e.target.value)}
          className="settings__select"
        >
          <option value="basic">Basic</option>
          <option value="standard">Standard</option>
          <option value="deep">Deep</option>
        </select>
      </div>

      <div className="settings__group">
        <label className="settings__label">Output Format</label>
        <select
          value={settings.analyze.format}
          onChange={(e) => handleChange('analyze', 'format', e.target.value)}
          className="settings__select"
        >
          <option value="json">JSON</option>
          <option value="html">HTML</option>
          <option value="markdown">Markdown</option>
        </select>
      </div>

      <button
        type="submit"
        className="button button--primary"
        disabled={isLoading}
      >
        Run Analysis
      </button>
    </form>
  );

  // Отображение настроек для генерации кода
  const renderCodeSettings = () => (
    <form onSubmit={handleSubmit}>
      <div className="settings__group">
        <label className="settings__label">Framework</label>
        <select
          value={settings.code.framework}
          onChange={(e) => handleChange('code', 'framework', e.target.value)}
          className="settings__select"
        >
          <option value="react">React</option>
          <option value="vue">Vue</option>
          <option value="html">HTML/CSS</option>
        </select>
      </div>

      <div className="settings__group">
        <label className="settings__label">Styling</label>
        <select
          value={settings.code.styling}
          onChange={(e) => handleChange('code', 'styling', e.target.value)}
          className="settings__select"
        >
          <option value="css">CSS</option>
          <option value="tailwind">Tailwind CSS</option>
          <option value="styled">Styled Components</option>
        </select>
      </div>

      <div className="settings__group">
        <label className="settings__label">Options</label>
        <div className="settings__checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.code.typescript}
              onChange={(e) => handleChange('code', 'typescript', e.target.checked)}
            />
            TypeScript
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.code.responsive}
              onChange={(e) => handleChange('code', 'responsive', e.target.checked)}
            />
            Responsive
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="button button--primary"
        disabled={isLoading}
      >
        Generate Code
      </button>
    </form>
  );

  // Отображение настроек для адаптивной верстки
  const renderResponsiveSettings = () => (
    <form onSubmit={handleSubmit}>
      <div className="settings__group">
        <label className="settings__label">Target Devices</label>
        <div className="settings__checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.responsive.devices.includes('tablet')}
              onChange={(e) => {
                const devices = e.target.checked 
                  ? [...settings.responsive.devices, 'tablet']
                  : settings.responsive.devices.filter((d: string) => d !== 'tablet');
                handleChange('responsive', 'devices', devices);
              }}
            />
            Tablet (768px)
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.responsive.devices.includes('mobile-l')}
              onChange={(e) => {
                const devices = e.target.checked 
                  ? [...settings.responsive.devices, 'mobile-l']
                  : settings.responsive.devices.filter((d: string) => d !== 'mobile-l');
                handleChange('responsive', 'devices', devices);
              }}
            />
            Mobile Large (425px)
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.responsive.devices.includes('mobile-s')}
              onChange={(e) => {
                const devices = e.target.checked 
                  ? [...settings.responsive.devices, 'mobile-s']
                  : settings.responsive.devices.filter((d: string) => d !== 'mobile-s');
                handleChange('responsive', 'devices', devices);
              }}
            />
            Mobile Small (320px)
          </label>
        </div>
      </div>

      <div className="settings__group">
        <label className="settings__label">Adaptation Strategy</label>
        <select
          value={settings.responsive.strategy}
          onChange={(e) => handleChange('responsive', 'strategy', e.target.value)}
          className="settings__select"
        >
          <option value="stack">Stack (vertical stacking)</option>
          <option value="shrink">Shrink (proportional resize)</option>
          <option value="reflow">Reflow (intelligent rearrangement)</option>
        </select>
      </div>

      <div className="settings__group">
        <label className="settings__label">Min Touch Target Size (px)</label>
        <input
          type="number"
          min="24"
          max="64"
          value={settings.responsive.minTouchTarget}
          onChange={(e) => handleChange('responsive', 'minTouchTarget', parseInt(e.target.value, 10))}
          className="settings__input"
        />
      </div>

      <div className="settings__group">
        <label className="settings__label">Options</label>
        <div className="settings__checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.responsive.preserveProportions}
              onChange={(e) => handleChange('responsive', 'preserveProportions', e.target.checked)}
            />
            Preserve Element Proportions
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="button button--primary"
        disabled={isLoading}
      >
        Generate Responsive Layout
      </button>
    </form>
  );

  const renderVariantsSettings = () => (
    <form onSubmit={handleSubmit}>
      <div className="settings__group">
        <label className="settings__label">Component Description</label>
        <textarea
          value={settings.variants.description}
          onChange={(e) => handleChange('variants', 'description', e.target.value)}
          className="settings__textarea"
          placeholder="Describe the component you want to generate variants for..."
          rows={3}
        />
      </div>

      <div className="settings__group">
        <label className="settings__label">Number of Variants</label>
        <input
          type="number"
          min="1"
          max="5"
          value={settings.variants.count}
          onChange={(e) => handleChange('variants', 'count', parseInt(e.target.value, 10))}
          className="settings__input"
        />
      </div>

      <div className="settings__group">
        <label className="settings__label">Style</label>
        <select
          value={settings.variants.style}
          onChange={(e) => handleChange('variants', 'style', e.target.value)}
          className="settings__select"
        >
          <option value="minimal">Minimal</option>
          <option value="modern">Modern</option>
          <option value="creative">Creative</option>
          <option value="corporate">Corporate</option>
        </select>
      </div>

      <div className="settings__group">
        <label className="settings__label">Variation Types</label>
        <div className="settings__checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.variants.colorVariations}
              onChange={(e) => handleChange('variants', 'colorVariations', e.target.checked)}
            />
            Color Variations
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.variants.sizeVariations}
              onChange={(e) => handleChange('variants', 'sizeVariations', e.target.checked)}
            />
            Size Variations
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="button button--primary"
        disabled={isLoading}
      >
        Generate Variants
      </button>
    </form>
  );

  // Выбор настроек в зависимости от инструмента
  const renderSettings = () => {
    switch (tool) {
      case 'analyze':
        return renderAnalyzeSettings();
      case 'code':
        return renderCodeSettings();
      case 'responsive':
        return renderResponsiveSettings();
      case 'variants':
        return renderVariantsSettings();
      default:
        return null;
    }
  };

  return (
    <div className="settings">
      <h2 className="settings__title">
        {tool === 'analyze' && 'Analyze Design'}
        {tool === 'code' && 'Generate Code'}
        {tool === 'responsive' && 'Responsive Layout'}
        {tool === 'variants' && 'Component Variants'}
      </h2>
      <div className="settings__content">
        {renderSettings()}
      </div>
    </div>
  );
};

export default Settings; 