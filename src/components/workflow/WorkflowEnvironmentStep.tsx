import { useState, useMemo } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';

interface FormData {
  temperature: string;
  humidity: string;
  note: string;
}

const DEFAULT_FORM: FormData = {
  temperature: '',
  humidity: '',
  note: '',
};

export function WorkflowEnvironmentStep() {
  const { state, nextStep, prevStep, addTemperatureHumidity, removeTemperatureHumidity } =
    useWorkflow();
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAdding, setIsAdding] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const temp = parseFloat(formData.temperature);
    const hum = parseFloat(formData.humidity);

    if (isNaN(temp)) {
      newErrors.temperature = '请输入有效的温度值';
    } else if (temp < 0 || temp > 50) {
      newErrors.temperature = '温度应在 0-50°C 之间';
    }

    if (isNaN(hum)) {
      newErrors.humidity = '请输入有效的湿度值';
    } else if (hum < 0 || hum > 100) {
      newErrors.humidity = '湿度应在 0-100% 之间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    addTemperatureHumidity({
      temperature: parseFloat(formData.temperature),
      humidity: parseFloat(formData.humidity),
      note: formData.note || undefined,
    });
    setFormData(DEFAULT_FORM);
    setIsAdding(false);
  };

  const handleDeleteRecord = (recordId: string) => {
    if (!window.confirm('确定要删除这条温湿度记录吗？')) return;
    removeTemperatureHumidity(recordId);
  };

  const sortedRecords = useMemo(() => {
    return [...state.temperatureHumidityRecords].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
  }, [state.temperatureHumidityRecords]);

  const stats = useMemo(() => {
    if (state.temperatureHumidityRecords.length === 0) {
      return {
        maxTemp: undefined,
        minTemp: undefined,
        maxHumidity: undefined,
        minHumidity: undefined,
        latest: undefined,
      };
    }
    const temperatures = state.temperatureHumidityRecords.map((r) => r.temperature);
    const humidities = state.temperatureHumidityRecords.map((r) => r.humidity);
    return {
      maxTemp: Math.max(...temperatures),
      minTemp: Math.min(...temperatures),
      maxHumidity: Math.max(...humidities),
      minHumidity: Math.min(...humidities),
      latest: sortedRecords[0],
    };
  }, [state.temperatureHumidityRecords, sortedRecords]);

  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
  };

  return (
    <div className="workflow-step-content">
      <div className="panel">
        <div className="heading">
          <div>
            <p>环境监测</p>
            <h2>温湿度记录采集</h2>
            <p style={{ marginTop: '4px', color: '#64748b', fontSize: '13px' }}>
              共 {state.temperatureHumidityRecords.length} 条记录
            </p>
          </div>
          <button
            className="primary"
            style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}
            onClick={() => setIsAdding(true)}
          >
            + 新增记录
          </button>
        </div>

        {state.temperatureHumidityRecords.length > 0 && (
          <div className="th-stats-grid">
            <div className="th-stat-card temp-stat">
              <div className="th-stat-icon">🌡️</div>
              <div>
                <small>当前温度</small>
                <strong>{stats.latest?.temperature.toFixed(1)}°C</strong>
              </div>
            </div>
            <div className="th-stat-card humidity-stat">
              <div className="th-stat-icon">💧</div>
              <div>
                <small>当前湿度</small>
                <strong>{stats.latest?.humidity.toFixed(0)}%</strong>
              </div>
            </div>
            <div className="th-stat-card">
              <div>
                <small>温度范围</small>
                <p>
                  {stats.minTemp?.toFixed(1)} ~ {stats.maxTemp?.toFixed(1)}°C
                </p>
              </div>
            </div>
            <div className="th-stat-card">
              <div>
                <small>湿度范围</small>
                <p>
                  {stats.minHumidity?.toFixed(0)} ~ {stats.maxHumidity?.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {isAdding && (
          <form onSubmit={handleAddRecord} className="th-add-form">
            <div className="field-grid">
              <label>
                <span>温度 (°C) *</span>
                <input
                  type="number"
                  name="temperature"
                  placeholder="如 22.5"
                  value={formData.temperature}
                  onChange={handleInputChange}
                  min="0"
                  max="50"
                  step="0.5"
                  style={{ borderColor: errors.temperature ? '#dc2626' : undefined }}
                />
                {errors.temperature && (
                  <span style={{ color: '#dc2626', fontSize: '12px' }}>
                    {errors.temperature}
                  </span>
                )}
              </label>
              <label>
                <span>湿度 (%) *</span>
                <input
                  type="number"
                  name="humidity"
                  placeholder="如 45"
                  value={formData.humidity}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="1"
                  style={{ borderColor: errors.humidity ? '#dc2626' : undefined }}
                />
                {errors.humidity && (
                  <span style={{ color: '#dc2626', fontSize: '12px' }}>
                    {errors.humidity}
                  </span>
                )}
              </label>
              <label className="full-width">
                <span>备注（可选）</span>
                <input
                  type="text"
                  name="note"
                  placeholder="如：开始调音前、中场休息后等"
                  value={formData.note}
                  onChange={handleInputChange}
                />
              </label>
            </div>
            <div className="th-form-actions">
              <button type="button" onClick={() => setIsAdding(false)}>
                取消
              </button>
              <button
                type="submit"
                className="primary"
                style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}
              >
                保存记录
              </button>
            </div>
          </form>
        )}

        {state.temperatureHumidityRecords.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <p>暂无温湿度记录</p>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              点击"新增记录"按钮开始记录温湿度数据
            </p>
          </div>
        ) : (
          <div className="th-timeline">
            {sortedRecords.map((record, index) => (
              <div
                key={record.id}
                className={`th-timeline-item ${index === 0 ? 'latest' : ''}`}
              >
                <div className="th-timeline-dot">{index === 0 ? '📍' : '•'}</div>
                <div className="th-timeline-content">
                  <div className="th-timeline-header">
                    <span className="th-time">{formatDateTime(record.recordedAt)}</span>
                    {record.note && <span className="th-note-tag">{record.note}</span>}
                    <button
                      className="th-delete-btn"
                      onClick={() => handleDeleteRecord(record.id)}
                      title="删除记录"
                    >
                      ×
                    </button>
                  </div>
                  <div className="th-timeline-values">
                    <div className="th-value temp-value">
                      <span className="th-value-label">温度</span>
                      <span className="th-value-number">
                        {record.temperature.toFixed(1)}°C
                      </span>
                    </div>
                    <div className="th-value humidity-value">
                      <span className="th-value-label">湿度</span>
                      <span className="th-value-number">
                        {record.humidity.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="workflow-nav-footer">
        <button onClick={prevStep}>← 上一步：调音偏差录入</button>
        <button
          className="primary"
          onClick={nextStep}
          style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}
        >
          下一步：异常音管复检 →
        </button>
      </div>
    </div>
  );
}
