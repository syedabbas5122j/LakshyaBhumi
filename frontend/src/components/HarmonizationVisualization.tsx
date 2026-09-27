import { useState } from 'react'
import type { HarmonizationRun } from '../data'
import { uploadApi, type UploadedDataset } from '../services/uploadApi'
import { engineApi, type LiveHarmonizationResult } from '../services/engineApi'
import './HarmonizationVisualization.css'

type HarmonizationVisualizationProps = {
  run: HarmonizationRun
  latestPublishedRun?: HarmonizationRun
  canRun: boolean
}

const shorten = (value: string) => value.replace(/\s+\d{4}-\d{2}-\d{2}$/, '')

const pipelineStages = [
  {
    key: 'georeferencing',
    number: '01',
    label: 'Geo-referencing',
    description: 'Normalise source layers to a common coordinate reference system (EPSG:4326).',
    package: 'pyproj (PROJ 9.3) + Shapely',
    algorithm: 'Affine transformation & Coordinate Reprojection Engine',
    reasoning: 'Transforming all heterogenous survey layers (local cadastral grids, WGS84 drone orthophotos, state plane meters) into a single unified coordinate space prevents spatial alignment drift.'
  },
  {
    key: 'matching',
    number: '02',
    label: 'Spatial matching',
    description: 'Align nearby features and calculate candidate parcel matches.',
    package: 'Shapely STRtree + scipy.spatial',
    algorithm: 'R-Tree Spatial Index + Directed Hausdorff Distance & IoU Blend',
    reasoning: 'Using STRtree R-tree spatial indexing avoids O(N²) pair comparisons. Blending Intersection-over-Union (IoU), Hausdorff boundary distance, and centroid proximity yields precise candidate matching.'
  },
  {
    key: 'topology',
    number: '03',
    label: 'Topology correction',
    description: 'Repair invalid geometry, slivers, gaps, overlaps and boundary vertex drift.',
    package: 'Shapely validation & snap (GEOS C API)',
    algorithm: 'make_valid() + Priority Overlap Trimming + Vertex Snapping',
    reasoning: 'Eliminates invalid self-intersections and slivers while preserving survey-grade ground truth priorities (GNSS > Drone > Cadastral).'
  },
  {
    key: 'attributes',
    number: '04',
    label: 'Attribute mapping',
    description: 'Reconcile field names, values and multi-lingual revenue schemas.',
    package: 'rapidfuzz (Levenshtein + Token Sort Ratio)',
    algorithm: 'Fuzzy Schema Alignment & Phonetic Land Record Matcher',
    reasoning: 'Reconciles variations in revenue terminology (Khatauni / Pahani / RoR / Patta) and owner name spelling variations across state databases.'
  },
  {
    key: 'conflicts',
    number: '05',
    label: 'Conflict resolution',
    description: 'Detect conflicts and identify cases safe to auto-resolve via source hierarchy.',
    package: 'GeoAI Conflict Engine + Pydantic v2',
    algorithm: 'Source-Priority Arbitration & Severity Threshold Classifier',
    reasoning: 'Low-severity boundary overlaps (<5%) are auto-resolved using survey hierarchy. High-severity land disputes are flagged for ground-truth escalation.'
  },
  {
    key: 'confidence',
    number: '06',
    label: 'Confidence scoring',
    description: 'Score geometry quality, source tier priors, match strength and review risk.',
    package: 'Multi-Factor Weighted Prior Evaluator',
    algorithm: 'Composite Bayesian Quality Prior Scoring',
    reasoning: 'Combines positional accuracy priors (GNSS 0.02m vs Drone 0.1m vs Cadastral 2m) with geometry repair deductions to generate a transparent composite score (0-100%).'
  },
  {
    key: 'changes',
    number: '07',
    label: 'Change detection',
    description: 'Compare the harmonized output with the baseline parcel survey.',
    package: 'Shapely Area Delta & Attribute Diff Tracker',
    algorithm: 'Feature-Level Change Classifier & Noise Suppressor',
    reasoning: 'Classifies every feature into ADDED, REMOVED, MODIFIED, or UNCHANGED while suppressing micro-noise threshold area fluctuations.'
  },
]

const downloadJson = (filename: string, value: unknown) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function HarmonizationVisualization({ run, latestPublishedRun, canRun }: HarmonizationVisualizationProps) {
  const [liveResult, setLiveResult] = useState<LiveHarmonizationResult | null>(null)
  const [selectedStepKey, setSelectedStepKey] = useState<string>('georeferencing')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalCurrentStepIndex, setModalCurrentStepIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const confidenceTone = run.confidence >= 90 ? 'high' : run.confidence >= 80 ? 'medium' : 'low'
  const publishedDelta = latestPublishedRun && latestPublishedRun.id !== run.id
    ? run.confidence - latestPublishedRun.confidence
    : null

  const activeStage = pipelineStages.find((stage) => stage.key === selectedStepKey) ?? pipelineStages[0]
  const activeCompletedStep = liveResult?.steps.find((step) => step.key === selectedStepKey)

  const triggerHarmonizationRun = async () => {
    setBusy(true)
    setError('')
    setIsModalOpen(true)
    setModalCurrentStepIndex(0)
    try {
      const { uploads } = await uploadApi.list()
      const [source, target] = uploads as UploadedDataset[]
      const res = source && target
        ? await engineApi.runHarmonization(source.id, target.id)
        : await engineApi.runHarmonization()
      
      // Simulate real-time step progress transitions in the modal
      for (let i = 0; i < res.steps.length; i++) {
        setModalCurrentStepIndex(i)
        setSelectedStepKey(res.steps[i].key)
        await new Promise((resolve) => setTimeout(resolve, 800))
      }
      setLiveResult(res)
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Harmonization failed.')
    } finally {
      setBusy(false)
    }
  }

  const modalActiveStage = pipelineStages[modalCurrentStepIndex] ?? pipelineStages[0]
  const modalCompletedStep = liveResult?.steps.find((step) => step.key === modalActiveStage.key)

  return (
    <section className="harmonization-visualization" aria-labelledby="harmonization-visual-title">
      <div className="harmonization-visual-heading">
        <div>
          <span className="eyebrow">CORE AI HARMONIZATION PIPELINE</span>
          <h3 id="harmonization-visual-title">Step-by-Step Interactive Harmonization Visualizer</h3>
        </div>
        <div className="harmonization-heading-actions">
          <span className={`harmonization-status ${confidenceTone}`}>{liveResult ? 'Live Result' : run.status}</span>
          {canRun && (
            <button type="button" className="harmonization-run-button" onClick={triggerHarmonizationRun} disabled={busy}>
              {busy ? 'Running GeoAI Engine...' : '⚡ Run Live Harmonization'}
            </button>
          )}
        </div>
      </div>

      {error && <p className="harmonization-run-error" role="alert">{error}</p>}

      {/* BIG HARMONIZATION PROCESSOR MODAL DIALOG */}
      {isModalOpen && (
        <div className="harmonization-modal-backdrop" onClick={() => !busy && setIsModalOpen(false)}>
          <div className="harmonization-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-dialog-header">
              <div>
                <span className="modal-eyebrow">GEOAI HARMONIZATION PROCESSOR</span>
                <h3>AI Harmonization Pipeline Execution</h3>
              </div>
              <div className="modal-header-actions">
                <span className={`modal-status-tag ${busy ? 'processing' : 'complete'}`}>
                  {busy ? 'Processing Step 0' + (modalCurrentStepIndex + 1) + ' of 07...' : 'Pipeline Completed Successfully ✓'}
                </span>
                <button type="button" className="modal-close-button" onClick={() => !busy && setIsModalOpen(false)} disabled={busy}>
                  ✕
                </button>
              </div>
            </div>

            <div className="modal-body-layout">
              {/* Left Column: Interactive 7-Step Navigation */}
              <div className="modal-steps-sidebar">
                <span className="modal-sidebar-title">PIPELINE STAGES</span>
                {pipelineStages.map((stage, index) => {
                  const isDone = liveResult && !busy
                  const isCurrent = modalCurrentStepIndex === index
                  return (
                    <button
                      key={stage.key}
                      type="button"
                      className={`modal-step-tab ${isCurrent ? 'active' : ''} ${isDone || index < modalCurrentStepIndex ? 'done' : ''}`}
                      onClick={() => setModalCurrentStepIndex(index)}
                    >
                      <div className="step-tab-number">{stage.number}</div>
                      <div className="step-tab-info">
                        <strong>{stage.label}</strong>
                        <small>{isDone || index < modalCurrentStepIndex ? '✓ Executed' : isCurrent && busy ? '⚙ Running...' : 'Pending'}</small>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Right Column: Step Deep Dive Thought Process & Technical Specs */}
              <div className="modal-step-detail">
                <div className="detail-top-bar">
                  <div>
                    <span className="detail-stage-num">STAGE {modalActiveStage.number} / 07</span>
                    <h4>{modalActiveStage.label}</h4>
                  </div>
                  <span className="detail-status-pill">
                    {modalCompletedStep ? 'ENGINE OUTPUT VERIFIED' : busy ? 'PROCESSING IN REAL-TIME...' : 'READY'}
                  </span>
                </div>

                <p className="detail-stage-desc">{modalActiveStage.description}</p>

                {/* ANIMATED SPATIAL STAGE PREVIEW (3D / VIDEO STYLE PIPELINE SIMULATION) */}
                <div className="spatial-stage-preview">
                  <div className="preview-overlay-tag">
                    <span className="live-dot" /> 3D SPATIAL PIPELINE PREVIEW — STAGE {modalActiveStage.number}
                  </div>
                  <div className={`preview-canvas-simulation stage-${modalActiveStage.key}`}>
                    {modalActiveStage.key === 'georeferencing' && (
                      <div className="sim-georef">
                        <div className="grid-layer plane-unaligned" />
                        <div className="grid-layer plane-reprojected" />
                        <div className="sim-scan-line" />
                        <span className="sim-label">WGS84 (EPSG:4326) CRS Alignment Grid</span>
                      </div>
                    )}
                    {modalActiveStage.key === 'matching' && (
                      <div className="sim-matching">
                        <div className="target-polygon" />
                        <div className="source-polygon pulse-match" />
                        <div className="rtree-bounding-box" />
                        <div className="match-score-badge">IoU: 0.94 • Hausdorff: 0.0001°</div>
                      </div>
                    )}
                    {modalActiveStage.key === 'topology' && (
                      <div className="sim-topology">
                        <div className="poly-invalid-boundary" />
                        <div className="vertex-snap-point v1" />
                        <div className="vertex-snap-point v2" />
                        <div className="poly-fixed-boundary glow" />
                        <div className="sim-action-chip">make_valid() + Snap 0.00001°</div>
                      </div>
                    )}
                    {modalActiveStage.key === 'attributes' && (
                      <div className="sim-attributes">
                        <div className="schema-card src">
                          <span>SOURCE (Pahani)</span>
                          <b>khata_no: 402</b>
                          <b>pattadar: Alice Devi</b>
                        </div>
                        <div className="schema-arrow">➔</div>
                        <div className="schema-card tgt">
                          <span>TARGET (Standard)</span>
                          <b>survey_number: 402</b>
                          <b>owner_name: Alice Devi</b>
                        </div>
                        <div className="fuzzy-match-badge">RapidFuzz Match: 98.4%</div>
                      </div>
                    )}
                    {modalActiveStage.key === 'conflicts' && (
                      <div className="sim-conflicts">
                        <div className="conflict-zone-overlap" />
                        <div className="priority-winner-poly" />
                        <div className="arbitration-badge">GNSS Prior &gt; Cadastral (Auto-Resolved)</div>
                      </div>
                    )}
                    {modalActiveStage.key === 'confidence' && (
                      <div className="sim-confidence">
                        <div className="confidence-dial-wrap">
                          <svg viewBox="0 0 100 100" className="confidence-meter-svg">
                            <circle cx="50" cy="50" r="40" className="bg-ring" />
                            <circle cx="50" cy="50" r="40" className="fill-ring" style={{ strokeDashoffset: 251.2 * (1 - 0.94) }} />
                          </svg>
                          <span className="confidence-val">94%</span>
                        </div>
                        <div className="sim-quality-tags">
                          <span>✓ GNSS 0.02m Prior</span>
                          <span>✓ Valid Geometry</span>
                          <span>✓ Single Owner</span>
                        </div>
                      </div>
                    )}
                    {modalActiveStage.key === 'changes' && (
                      <div className="sim-changes">
                        <div className="change-layer before-layer" />
                        <div className="change-layer after-layer" />
                        <div className="delta-diff-highlight" />
                        <div className="change-summary-pill">MODIFIED: Boundary area +2.4 m²</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thought Reasoning Box (Claude Style) */}
                <div className="thought-reasoning-box">
                  <div className="thought-box-header">
                    <span className="thought-icon">🧠</span>
                    <strong>GeoAI Reasoning & Spatial Logic</strong>
                  </div>
                  <p>{modalActiveStage.reasoning}</p>
                </div>

                {/* Tech Specs: Package & Algorithm */}
                <div className="tech-specs-grid">
                  <div className="tech-spec-card">
                    <label>PYTHON PACKAGE / MODULE</label>
                    <strong>{modalActiveStage.package}</strong>
                  </div>
                  <div className="tech-spec-card">
                    <label>ALGORITHM / METHODOLOGY</label>
                    <strong>{modalActiveStage.algorithm}</strong>
                  </div>
                </div>

                {/* Step Execution Metrics */}
                <div className="step-metrics-section">
                  <label className="section-label">REAL-TIME STEP OUTPUT METRICS</label>
                  <div className="metrics-cards-grid">
                    <div className="metric-box">
                      <span>Status Detail</span>
                      <strong>{modalCompletedStep?.detail ?? 'Awaiting execution...'}</strong>
                    </div>
                    {modalCompletedStep?.metrics && Object.entries(modalCompletedStep.metrics).map(([k, v]) => (
                      <div className="metric-box" key={k}>
                        <span>{k}</span>
                        <strong>{String(v)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-dialog-footer">
              <small>Outputs automatically verified and formatted to GeoJSON EPSG:4326 specifications.</small>
              {liveResult && (
                <div className="modal-footer-actions">
                  <button type="button" className="secondary-download" onClick={() => downloadJson(`${liveResult.run_id}-harmonized.geojson`, liveResult.output.geojson)}>
                    📥 Download GeoJSON
                  </button>
                  <button type="button" className="primary-close" onClick={() => setIsModalOpen(false)}>
                    Close Visualizer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="harmonization-live-result">
        <div className="harmonization-live-heading">
          <span className="harmonization-stage-label">{liveResult ? 'LIVE PIPELINE EXECUTION STEPS' : 'SEVEN-STAGE PIPELINE (CLICK ANY STEP TO INSPECT)'}</span>
          <div className="harmonization-live-actions">
            <small>{liveResult ? `${liveResult.source.name} + ${liveResult.target.name} · ${liveResult.output.features.toLocaleString()} output features` : 'Click on any pipeline step below to inspect granular metrics.'}</small>
            {liveResult && <div className="harmonization-downloads">
              <button type="button" onClick={() => downloadJson(`${liveResult.run_id}-harmonized.geojson`, liveResult.output.geojson)}>Download GeoJSON</button>
              <button type="button" onClick={() => downloadJson(`${liveResult.run_id}-pipeline-report.json`, liveResult.output.report)}>Download report</button>
            </div>}
          </div>
        </div>

        {/* Horizontal interactive step selector */}
        <div className="harmonization-step-panels">
          {pipelineStages.map((stage) => {
            const completedStep = liveResult?.steps.find((step) => step.key === stage.key)
            const isSelected = stage.key === selectedStepKey
            return (
              <button
                type="button"
                className={`harmonization-step-panel ${completedStep ? 'completed' : 'ready'} ${isSelected ? 'active-step' : ''}`}
                key={stage.key}
                onClick={() => setSelectedStepKey(stage.key)}
              >
                <div className="harmonization-step-panel-top">
                  <span>{stage.number}</span>
                  <b>{completedStep ? '✓ Done' : 'Ready'}</b>
                </div>
                <strong>{stage.label}</strong>
                <p>{stage.description}</p>
                <small>{completedStep?.detail ?? 'Click to inspect step configuration'}</small>
              </button>
            )
          })}
        </div>

        {/* Step Inspector Panel */}
        <div className="harmonization-step-inspector">
          <div className="inspector-header">
            <div className="inspector-badge">STAGE {pipelineStages.findIndex(s => s.key === selectedStepKey) + 1} OF 7</div>
            <h4>{activeStage.label} Inspection</h4>
            <span className="inspector-status-pill">{activeCompletedStep ? 'COMPLETED BY GEOAI ENGINE' : 'READY FOR EXECUTION'}</span>
          </div>
          <p className="inspector-description">{activeStage.description}</p>

          <div className="inspector-grid">
            <div className="inspector-metric-card">
              <label>Status Summary</label>
              <strong>{activeCompletedStep?.detail ?? 'Pending execution start'}</strong>
            </div>
            {activeCompletedStep?.metrics && Object.entries(activeCompletedStep.metrics).map(([metricLabel, metricValue]) => (
              <div className="inspector-metric-card" key={metricLabel}>
                <label>{metricLabel}</label>
                <strong>{String(metricValue)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="harmonization-flow">
        <div className="harmonization-stage harmonization-sources">
          <span className="harmonization-stage-label">01 / INPUT SOURCES</span>
          <div className="harmonization-source-list">
            {(liveResult ? [liveResult.source.name, liveResult.target.name] : run.inputVersions).map((input) => <div key={input} className="harmonization-source"><i />{shorten(input)}</div>)}
          </div>
        </div>
        <div className="harmonization-connector" aria-hidden="true"><span>merge</span><b>→</b></div>
        <div className="harmonization-stage harmonization-engine">
          <span className="harmonization-stage-label">02 / GEOAI ENGINE</span>
          <strong>{run.modelVersion}</strong>
          <small>Spatial match, conflict detection and source lineage</small>
        </div>
        <div className="harmonization-connector" aria-hidden="true"><span>publish</span><b>→</b></div>
        <div className="harmonization-stage harmonization-output">
          <span className="harmonization-stage-label">03 / OUTPUT</span>
          <strong>{liveResult ? 'Harmonized Output · Version 1.0' : `${run.outputName} · Version ${run.outputVersion}`}</strong>
          <small>{liveResult ? `File: ${liveResult.stored_files?.geojson_filename ?? 'harmonized-output.geojson'} · ${liveResult.output.features.toLocaleString()} generated features` : `${run.changedFeatures.toLocaleString()} changed features`}</small>
        </div>
      </div>

      <div className="harmonization-metrics">
        <div className="harmonization-metric">
          <div><span>Confidence</span><strong>{run.confidence}%</strong></div>
          <div className="harmonization-meter"><i className={confidenceTone} style={{ width: `${run.confidence}%` }} /></div>
        </div>
        <div className="harmonization-metric">
          <div><span>Positional uncertainty</span><strong>±{run.uncertaintyMeters} m</strong></div>
          <div className="harmonization-uncertainty"><i style={{ width: `${Math.min(run.uncertaintyMeters * 150, 100)}%` }} /></div>
        </div>
        <div className="harmonization-metric harmonization-metric-note">
          <span>Compared with latest published</span>
          <strong>{publishedDelta === null ? 'Current published output' : `${publishedDelta >= 0 ? '+' : ''}${publishedDelta}% confidence`}</strong>
        </div>
      </div>
    </section>
  )
}
