import { useRef, useState } from 'react';

export function AdvancedTools({
  backupMessage,
  onClearStorage,
  onExportBackup,
  onRestoreBackup,
  onToggleAutoRestore,
  preferences,
  storageReport,
}) {
  const fileRef = useRef(null);
  const [openPanel, setOpenPanel] = useState('');

  function toggle(panel) {
    setOpenPanel((current) => (current === panel ? '' : panel));
  }

  function handleBackupFile(event) {
    const [file] = event.target.files || [];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        onRestoreBackup(JSON.parse(String(reader.result || '{}')));
      } catch {
        onRestoreBackup(null);
      }
    };
    reader.readAsText(file);
  }

  const usedMb = storageReport ? (storageReport.totalBytes / 1024 / 1024).toFixed(2) : '0.00';
  const topItems = storageReport?.items?.slice(0, 4) || [];

  return (
    <section className="advanced-tools dc" aria-labelledby="advanced-title">
      <button className="advanced-tools__summary" onClick={() => toggle('tools')} type="button" aria-expanded={openPanel === 'tools'}>
        <span>
          <strong id="advanced-title">Strumenti avanzati</strong>
          <small>Backup e preferenze</small>
        </span>
        <span aria-hidden="true">{openPanel === 'tools' ? '−' : '+'}</span>
      </button>

      {openPanel === 'tools' ? (
        <div className="advanced-tools__body">
          <div className="advanced-grid">
            <section className="advanced-block">
              <h3>Preferenze</h3>
              <label className="check-row">
                <input checked={Boolean(preferences.autoRestore)} onChange={(event) => onToggleAutoRestore(event.target.checked)} type="checkbox" />
                Riapri l'ultimo mese salvato
              </label>
            </section>

            <section className="advanced-block">
              <h3>Backup</h3>
              <input accept="application/json" className="file-input" onChange={handleBackupFile} ref={fileRef} type="file" />
              <div className="backup-actions">
                <button className="small-button" onClick={onExportBackup} type="button">
                  Esporta backup
                </button>
                <button className="small-button small-button--ghost" onClick={() => fileRef.current?.click()} type="button">
                  Ripristina backup
                </button>
              </div>
              {backupMessage ? <p className="muted-text">{backupMessage}</p> : null}
            </section>

            <section className="advanced-block advanced-block--memory">
              <h3>Memoria dati</h3>
              <div className="storage-meter" aria-label={`Memoria locale usata ${usedMb} MB`}>
                <span style={{ width: `${Math.min(100, (storageReport?.totalBytes || 0) / 5242880 * 100)}%` }} />
              </div>
              <p className="muted-text">
                Dati locali usati: <strong>{usedMb} MB</strong>. Se lo spazio finisce, esporta un backup prima di cancellare.
              </p>
              {topItems.length ? (
                <div className="storage-list" aria-label="Dati principali salvati">
                  {topItems.map((item) => (
                    <span key={item.key}>
                      {item.key.replace(/^ts_(?:preco_v3_|orari_v20_)?/, '')}
                      <strong>{(item.bytes / 1024).toFixed(0)} KB</strong>
                    </span>
                  ))}
                </div>
              ) : null}
              <button className="small-button small-button--danger" onClick={onClearStorage} type="button">
                Libera memoria
              </button>
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}
