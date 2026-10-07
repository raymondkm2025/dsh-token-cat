/**
 * dsh-token-cat client half: loaded by the web ModuleLoader as a plain React
 * plugin.
 *
 * Registers one entry in the frame-wide `shell.overlay` slot: a cat that lives
 * along the bottom edge of the DSH window, and a usage/cost HUD beside it.
 *
 * The cat runs on a small behaviour state machine rather than a fixed loop. It
 * picks random destinations, usually stops on arrival, turns its head to face
 * the viewer, and works through grooming, sleeping, stretching and alert
 * poses. While a model call is in flight it sprints and biases toward
 * stopping and staring.
 *
 * Usage data comes from the host half over /dsh-token-cat/snapshot.
 */
window.__ModuleLoader__.load({
  id: 'dsh-token-cat',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const el = React.createElement

    const CSS = [
      '.dsh-tc-root{position:fixed;inset:0;pointer-events:none;z-index:60;}',
      '.dsh-tc-lane{position:absolute;left:0;bottom:0;width:76px;height:62px;will-change:transform;}',
      '.dsh-tc-cat{color:var(--dsw-alias-brand-primary);cursor:pointer;pointer-events:auto;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3));}',
      '.dsh-tc-cat:hover{filter:drop-shadow(0 3px 7px rgba(0,0,0,.38));}',
      '.dsh-tc-cat svg{display:block;overflow:visible;}',
      '.dsh-tc-hud{position:absolute;right:16px;bottom:70px;pointer-events:auto;color:var(--dsw-alias-label-primary);font:12px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}',
      '.dsh-tc-pill{display:flex;align-items:center;gap:7px;padding:6px 11px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);box-shadow:0 4px 18px rgba(0,0,0,.2);cursor:pointer;font:inherit;font-variant-numeric:tabular-nums;color:inherit;}',
      '.dsh-tc-pill:hover{border-color:var(--dsw-alias-border-l2);}',
      '.dsh-tc-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-label-secondary);flex:0 0 auto;}',
      '.dsh-tc-dot[data-busy="1"]{background:var(--dsw-alias-state-success-primary);animation:dsh-tc-pulse 1s ease-in-out infinite;}',
      '@keyframes dsh-tc-pulse{0%,100%{opacity:1}50%{opacity:.3}}',
      '.dsh-tc-sep{opacity:.4;}',
      '.dsh-tc-cost{color:var(--dsw-alias-brand-primary);font-weight:600;}',
      '.dsh-tc-panel{position:absolute;right:0;bottom:44px;width:330px;max-height:60vh;overflow:auto;padding:13px;border-radius:12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-overlay);box-shadow:0 14px 38px rgba(0,0,0,.28);}',
      '.dsh-tc-title{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-weight:600;font-size:12.5px;margin-bottom:10px;}',
      '.dsh-tc-mood{font-weight:400;font-size:11px;color:var(--dsw-alias-label-secondary);margin-right:auto;margin-left:8px;}',
      '.dsh-tc-x{border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:15px;line-height:1;padding:2px 6px;border-radius:6px;}',
      '.dsh-tc-x:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}',
      '.dsh-tc-hero{display:flex;gap:10px;margin-bottom:10px;}',
      '.dsh-tc-card{flex:1;padding:9px 10px;border-radius:9px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);}',
      '.dsh-tc-k{font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);margin-bottom:3px;}',
      '.dsh-tc-v{font-size:16px;font-weight:650;font-variant-numeric:tabular-nums;}',
      '.dsh-tc-grid{display:grid;grid-template-columns:1fr auto;gap:3px 10px;font-size:11.5px;}',
      '.dsh-tc-grid span:nth-child(odd){color:var(--dsw-alias-label-secondary);}',
      '.dsh-tc-grid span:nth-child(even){text-align:right;font-variant-numeric:tabular-nums;}',
      '.dsh-tc-sec{margin-top:9px;border-top:1px solid var(--dsw-alias-border-l1);padding-top:8px;}',
      '.dsh-tc-sech{font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);margin-bottom:5px;}',
      '.dsh-tc-row{display:flex;justify-content:space-between;gap:8px;font-size:11.5px;padding:2px 0;font-variant-numeric:tabular-nums;}',
      '.dsh-tc-row b{font-weight:550;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.dsh-tc-row i{font-style:normal;color:var(--dsw-alias-label-secondary);flex:0 0 auto;}',
      '.dsh-tc-empty{font-size:11px;color:var(--dsw-alias-label-secondary);}',
      '.dsh-tc-foot{margin-top:10px;border-top:1px solid var(--dsw-alias-border-l1);padding-top:8px;display:flex;align-items:flex-end;justify-content:space-between;gap:8px;}',
      '.dsh-tc-note{font-size:10px;line-height:1.35;color:var(--dsw-alias-label-secondary);}',
      '.dsh-tc-actions{display:flex;gap:6px;flex:0 0 auto;}',
      '.dsh-tc-btn{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:7px;padding:4px 9px;cursor:pointer;font:inherit;font-size:11px;white-space:nowrap;}',
      '.dsh-tc-btn:hover{border-color:var(--dsw-alias-border-l2);}',
    ].join('')

    const SNAPSHOT_URL = '/dsh-token-cat/snapshot'
    const RESET_URL = '/dsh-token-cat/reset'

    // Each idle action names a body pose and how long the cat holds it, in
    // 40ms ticks. `watch` is the "stays put and looks at you" one.
    const ACTIONS = {
      watch: { pose: 'sit', min: 80, max: 220 },
      groom: { pose: 'sit', min: 70, max: 150 },
      sleep: { pose: 'lie', min: 180, max: 420 },
      stretch: { pose: 'stand', min: 50, max: 85 },
      alert: { pose: 'sit', min: 45, max: 100 },
    }

    const MOODS = {
      travel: 'on the prowl',
      watch: 'watching you',
      groom: 'grooming',
      sleep: 'asleep',
      stretch: 'stretching',
      alert: 'alert',
    }

    function fmtTokens(n) {
      const v = Number(n) || 0
      if (v < 1000) return String(Math.round(v))
      if (v < 1000000) return (v / 1000).toFixed(v < 10000 ? 1 : 0) + 'k'
      return (v / 1000000).toFixed(2) + 'M'
    }

    function fmtCost(n) {
      const v = Number(n) || 0
      if (v <= 0) return '$0.0000'
      if (v < 0.01) return '$' + v.toFixed(5)
      if (v < 1000) return '$' + v.toFixed(4)
      return '$' + v.toFixed(2)
    }

    function apply(ctx) {
      const slots = ctx.get('slots')
      if (slots === undefined) return

      ctx.effect(() => {
        const styleEl = document.createElement('style')
        styleEl.setAttribute('data-plugin', 'dsh-token-cat')
        styleEl.textContent = CSS
        document.head.appendChild(styleEl)
        return () => { if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl) }
      })

      const latest = { busy: false }

      // ---- cat behaviour state ------------------------------------------
      const S = {
        x: -20, targetX: 60, dir: 1, mode: 'travel', action: null, actionT: 0,
        pose: 'stand', face: 'side', turn: 0,
        phase: 0, tail: 0, zzz: 0,
        blink: 0, blinkTimer: 40,
        gazeX: 0, gazeY: 0, gazeTimer: 30,
      }

      function pickTarget() {
        // Occasionally pick a full crossing so the cat exits and re-enters.
        if (Math.random() < 0.22) return 116
        return 6 + Math.random() * 74
      }

      function startAction(busy) {
        const roll = Math.random()
        let action
        if (busy) {
          // While DSH is working the cat mostly stops and watches it happen.
          action = roll < 0.66 ? 'alert' : roll < 0.9 ? 'watch' : 'groom'
        } else {
          action = roll < 0.34 ? 'watch'
            : roll < 0.53 ? 'groom'
            : roll < 0.73 ? 'sleep'
            : roll < 0.88 ? 'stretch'
            : 'alert'
        }
        const spec = ACTIONS[action]
        S.mode = 'act'
        S.action = action
        S.pose = spec.pose
        S.actionT = spec.min + Math.floor(Math.random() * (spec.max - spec.min))
      }

      function step() {
        const busy = latest.busy
        S.phase += busy ? 0.62 : 0.30
        S.tail += busy ? 0.16 : 0.07
        S.zzz += 0.012

        // Blink on a loose random cadence.
        S.blinkTimer -= 1
        if (S.blinkTimer <= 0) {
          S.blink = 5
          S.blinkTimer = 45 + Math.floor(Math.random() * 95)
        }
        if (S.blink > 0) S.blink -= 1

        // Gaze drifts, but mostly returns to centre = looking straight at you.
        S.gazeTimer -= 1
        if (S.gazeTimer <= 0) {
          S.gazeTimer = 30 + Math.floor(Math.random() * 70)
          if (Math.random() < 0.55) { S.gazeX = 0; S.gazeY = 0 }
          else { S.gazeX = (Math.random() * 2 - 1) * 0.9; S.gazeY = (Math.random() * 2 - 1) * 0.5 }
        }

        if (S.mode === 'travel') {
          S.turn = Math.max(0, S.turn - 0.14)
          if (S.turn < 0.03) S.face = 'side'
          S.pose = 'stand'

          const speed = busy ? 0.66 : 0.26
          const d = S.targetX - S.x
          if (d !== 0) S.dir = d >= 0 ? 1 : -1
          if (Math.abs(d) <= speed) {
            S.x = S.targetX
            if (S.targetX > 110) {
              S.x = -20
              S.targetX = pickTarget()
            } else if (Math.random() < (busy ? 0.30 : 0.80)) {
              startAction(busy)
            } else {
              S.targetX = pickTarget()
            }
          } else {
            S.x += (d >= 0 ? 1 : -1) * speed
          }
        } else {
          S.turn = Math.min(1, S.turn + 0.16)
          if (S.turn > 0.30) S.face = 'front'
          S.actionT -= 1
          if (S.actionT <= 0) {
            S.mode = 'travel'
            S.action = null
            S.targetX = pickTarget()
          }
        }

        // Hand React a small owned snapshot rather than the live state object.
        return {
          x: S.x, phase: S.phase, tail: S.tail, zzz: S.zzz, turn: S.turn,
          pose: S.pose, face: S.face, action: S.action, mode: S.mode, dir: S.dir,
          blink: S.blink > 0, gazeX: S.gazeX, gazeY: S.gazeY,
        }
      }

      // ---- svg building blocks ------------------------------------------
      function shadow(cx, cy, rx) {
        return el('ellipse', { key: 'shadow', cx: cx, cy: cy, rx: rx, ry: 2.5, fill: 'currentColor', opacity: 0.13 })
      }

      function swayOf(value, amp, origin) {
        return {
          transform: 'rotate(' + (Math.sin(value) * amp).toFixed(1) + 'deg)',
          transformBox: 'fill-box',
          transformOrigin: origin,
        }
      }

      // A front-facing head: this is what makes the cat look at you. `turn`
      // squashes it horizontally so the head appears to rotate round.
      function frontHead(cx, cy, o) {
        const sx = Math.max(0.12, o.turn === undefined ? 1 : o.turn)
        const tilt = o.tilt || 0
        const gx = (o.gazeX || 0) * 0.9
        const gy = (o.gazeY || 0) * 0.7
        const ink = 'var(--dsw-alias-bg-base)'
        const p = []
        p.push(el('path', { key: 'earL', d: 'M-8.6 -4.4 L-10.4 -15.4 L-1.4 -8.6 Z', fill: 'currentColor' }))
        p.push(el('path', { key: 'earR', d: 'M1.4 -8.6 L10.4 -15.4 L8.6 -4.4 Z', fill: 'currentColor' }))
        p.push(el('path', { key: 'earLi', d: 'M-7 -5.6 L-8.6 -13 L-2.6 -8.4 Z', fill: ink, opacity: 0.5 }))
        p.push(el('path', { key: 'earRi', d: 'M2.6 -8.4 L8.6 -13 L7 -5.6 Z', fill: ink, opacity: 0.5 }))
        p.push(el('circle', { key: 'skull', cx: 0, cy: 0, r: 9, fill: 'currentColor' }))
        if (o.closed) {
          p.push(el('path', { key: 'eyeL', d: 'M-5.4 -0.4 Q-3.6 1.8 -1.8 -0.4', stroke: ink, strokeWidth: 1.1, fill: 'none', strokeLinecap: 'round' }))
          p.push(el('path', { key: 'eyeR', d: 'M1.8 -0.4 Q3.6 1.8 5.4 -0.4', stroke: ink, strokeWidth: 1.1, fill: 'none', strokeLinecap: 'round' }))
        } else {
          const ry = o.wide ? 2.3 : 1.9
          p.push(el('ellipse', { key: 'eyeL', cx: -3.5 + gx, cy: -0.4 + gy, rx: 1.5, ry: ry, fill: ink }))
          p.push(el('ellipse', { key: 'eyeR', cx: 3.5 + gx, cy: -0.4 + gy, rx: 1.5, ry: ry, fill: ink }))
        }
        p.push(el('path', { key: 'nose', d: 'M-1.5 2.6 L1.5 2.6 L0 4.2 Z', fill: ink, opacity: 0.9 }))
        p.push(el('path', { key: 'mouth', d: 'M-2.4 5.4 Q-1.2 6.8 0 5.4 Q1.2 6.8 2.4 5.4', stroke: ink, strokeWidth: 0.9, fill: 'none', strokeLinecap: 'round', opacity: 0.75 }))
        p.push(el('path', { key: 'w1', d: 'M-7.4 3 L-13.4 1.6', stroke: 'currentColor', strokeWidth: 0.9, fill: 'none', opacity: 0.5 }))
        p.push(el('path', { key: 'w2', d: 'M-7.4 5.4 L-13.4 6.4', stroke: 'currentColor', strokeWidth: 0.9, fill: 'none', opacity: 0.5 }))
        p.push(el('path', { key: 'w3', d: 'M7.4 3 L13.4 1.6', stroke: 'currentColor', strokeWidth: 0.9, fill: 'none', opacity: 0.5 }))
        p.push(el('path', { key: 'w4', d: 'M7.4 5.4 L13.4 6.4', stroke: 'currentColor', strokeWidth: 0.9, fill: 'none', opacity: 0.5 }))
        return el('g', {
          key: 'head',
          transform: 'translate(' + cx + ',' + cy + ') rotate(' + tilt.toFixed(1) + ') scale(' + sx.toFixed(3) + ',1)',
        }, p)
      }

      // Profile head, used while moving and while stretching.
      function sideHead(cx, cy, o) {
        const dir = o.dir < 0 ? -1 : 1
        const ink = 'var(--dsw-alias-bg-base)'
        const p = []
        p.push(el('path', { key: 'earL', d: 'M-6 -6 L-5 -15.4 L2 -8 Z', fill: 'currentColor' }))
        p.push(el('path', { key: 'earR', d: 'M3 -8 L9 -15.4 L8 -5 Z', fill: 'currentColor' }))
        p.push(el('circle', { key: 'skull', cx: 0, cy: 0, r: 9, fill: 'currentColor' }))
        p.push(el('ellipse', { key: 'muzzle', cx: 7, cy: 2.4, rx: 3.4, ry: 2.6, fill: 'currentColor' }))
        if (o.blink) {
          p.push(el('path', { key: 'eye', d: 'M2 0.4 Q4 2.4 6 0.4', stroke: ink, strokeWidth: 1.1, fill: 'none', strokeLinecap: 'round' }))
        } else {
          p.push(el('circle', { key: 'eye', cx: 4, cy: 0, r: 1.7, fill: ink }))
        }
        p.push(el('path', { key: 'nose', d: 'M9.2 1 L11.6 2.2 L9.2 3.4 Z', fill: ink, opacity: 0.9 }))
        p.push(el('path', { key: 'w1', d: 'M8 4 L14 2.6', stroke: 'currentColor', strokeWidth: 0.9, fill: 'none', opacity: 0.5 }))
        p.push(el('path', { key: 'w2', d: 'M8 5.6 L14 7', stroke: 'currentColor', strokeWidth: 0.9, fill: 'none', opacity: 0.5 }))
        return el('g', {
          key: 'head',
          transform: 'translate(' + cx + ',' + cy + ') rotate(' + (o.tilt || 0).toFixed(1) + ') scale(' + dir + ',1)',
        }, p)
      }

      // ---- body poses ----------------------------------------------------
      function standBody(v) {
        const parts = []
        const hips = [46, 40, 26, 20]
        for (let i = 0; i < 4; i++) {
          let deg = Math.sin(v.phase + i * Math.PI) * 30
          if (v.action === 'stretch') deg = i < 2 ? 58 : 4
          parts.push(el('g', {
            key: 'leg' + i,
            style: { transform: 'rotate(' + deg.toFixed(1) + 'deg)', transformBox: 'fill-box', transformOrigin: '50% 0%' },
          },
            el('path', { d: 'M' + hips[i] + ' 30 L' + hips[i] + ' 41', stroke: 'currentColor', strokeWidth: 5, strokeLinecap: 'round', fill: 'none' }),
            el('circle', { cx: hips[i], cy: 41, r: 2.6, fill: 'currentColor' }),
          ))
        }
        parts.push(el('path', {
          key: 'tail',
          d: v.action === 'alert' ? 'M19 22 C 13 12, 21 3, 28 6' : 'M19 22 C 8 24, 2 15, 9 5',
          stroke: 'currentColor', strokeWidth: 4.5, strokeLinecap: 'round', fill: 'none',
          style: swayOf(v.tail, 10, '100% 100%'),
        }))
        parts.push(el('ellipse', { key: 'body', cx: 36, cy: 24, rx: 18, ry: 10, fill: 'currentColor' }))
        return parts
      }

      function sitBody(v) {
        const parts = []
        parts.push(el('path', {
          key: 'tail', d: 'M22 39 C 6 41, 1 33, 11 30',
          stroke: 'currentColor', strokeWidth: 4.5, strokeLinecap: 'round', fill: 'none',
          style: swayOf(v.tail, 9, '100% 100%'),
        }))
        parts.push(el('ellipse', { key: 'haunch', cx: 26, cy: 33.5, rx: 10, ry: 8.5, fill: 'currentColor' }))
        parts.push(el('ellipse', { key: 'torso', cx: 38, cy: 25, rx: 12, ry: 13.5, fill: 'currentColor' }))
        const raise = v.action === 'groom'
        parts.push(el('g', { key: 'fl1' },
          el('path', { d: raise ? 'M45 33 L52 24' : 'M45 33 L45 41.5', stroke: 'currentColor', strokeWidth: 4.6, strokeLinecap: 'round', fill: 'none' }),
          el('circle', { cx: raise ? 52 : 45, cy: raise ? 24 : 41.5, r: 2.4, fill: 'currentColor' }),
        ))
        parts.push(el('g', { key: 'fl2' },
          el('path', { d: 'M50 33 L50 41.5', stroke: 'currentColor', strokeWidth: 4.6, strokeLinecap: 'round', fill: 'none' }),
          el('circle', { cx: 50, cy: 41.5, r: 2.4, fill: 'currentColor' }),
        ))
        return parts
      }

      function lieBody(v) {
        const parts = []
        parts.push(el('path', {
          key: 'tail', d: 'M14 37 C 4 38, 2 33, 12 32',
          stroke: 'currentColor', strokeWidth: 4.5, strokeLinecap: 'round', fill: 'none',
          style: swayOf(v.tail, 5, '100% 100%'),
        }))
        parts.push(el('ellipse', { key: 'body', cx: 36, cy: 36, rx: 20, ry: 7.5, fill: 'currentColor' }))
        parts.push(el('ellipse', { key: 'haunch', cx: 25, cy: 33, rx: 11, ry: 8, fill: 'currentColor' }))
        parts.push(el('ellipse', { key: 'paws', cx: 55, cy: 40, rx: 6, ry: 2.8, fill: 'currentColor' }))
        return parts
      }

      function CatView(props) {
        const v = props.v
        const kids = []

        if (v.pose === 'lie') {
          kids.push(shadow(38, 42.5, 23))
          kids.push(el('g', { key: 'body' }, lieBody(v)))
          kids.push(frontHead(50, 32, {
            turn: v.turn, closed: true, tilt: 7, gazeX: 0, gazeY: 0,
          }))
          const zs = []
          for (let i = 0; i < 3; i++) {
            const t = (v.zzz * 1.6 + i * 0.3333) % 1
            zs.push(el('text', {
              key: 'z' + i,
              x: (52 + t * 13).toFixed(1),
              y: (24 - t * 22).toFixed(1),
              fontSize: (4.5 + t * 4).toFixed(1),
              opacity: (1 - t) * 0.8,
              fill: 'currentColor',
              fontWeight: 700,
            }, 'z'))
          }
          kids.push(el('g', { key: 'zzz' }, zs))
        } else if (v.pose === 'sit') {
          const mirrored = v.dir < 0
          kids.push(shadow(36, 42.5, 18))
          kids.push(el('g', {
            key: 'body',
            transform: mirrored ? 'translate(76,0) scale(-1,1)' : undefined,
          }, sitBody(v)))

          const lean = v.action === 'alert' ? -1.4 : 0
          if (v.action === 'groom') {
            const bob = Math.sin(v.phase * 2) * 7
            kids.push(el('g', { key: 'headwrap', transform: 'translate(' + lean + ',0)' },
              frontHead(47, 15, { turn: v.turn, tilt: 21 + bob, gazeX: 0.35, gazeY: 0.45 }),
            ))
          } else {
            kids.push(el('g', { key: 'headwrap', transform: 'translate(' + lean + ',0)' },
              frontHead(46, 12, {
                turn: v.turn, closed: v.blink, wide: v.action === 'alert',
                gazeX: v.gazeX, gazeY: v.gazeY,
              }),
            ))
          }
        } else {
          const mirrored = v.dir < 0
          const inner = []
          inner.push(shadow(38, 43.5, 24))
          const bodyParts = standBody(v)
          for (let i = 0; i < bodyParts.length; i++) inner.push(bodyParts[i])
          if (v.action === 'stretch') {
            inner.push(sideHead(58, 24, { dir: v.dir, blink: v.blink, tilt: -13 }))
          } else {
            inner.push(sideHead(56, 17, { dir: v.dir, blink: v.blink }))
          }
          kids.push(el('g', {
            key: 'stand',
            transform: mirrored ? 'translate(76,0) scale(-1,1)' : undefined,
          }, el('g', {
            key: 'pose',
            transform: v.action === 'stretch' ? 'rotate(10 46 41)' : undefined,
          }, inner)))
        }

        return el('svg', { width: 76, height: 62, viewBox: '0 -18 76 62' }, kids)
      }

      function TokenCat() {
        const [snap, setSnap] = React.useState(null)
        const [open, setOpen] = React.useState(false)
        const [catOn, setCatOn] = React.useState(true)
        const [view, setView] = React.useState(null)

        React.useEffect(() => {
          let alive = true
          let tick = 0

          function pull() {
            fetch(SNAPSHOT_URL, { cache: 'no-store' })
              .then((r) => r.json())
              .then((value) => {
                if (!alive || !value) return
                latest.busy = value.busy === true
                setSnap(value)
              })
              .catch((err) => { console.error('token-cat snapshot failed', err) })
          }

          pull()
          // One 40ms heartbeat drives the behaviour machine, the gait and the poll.
          const stop = ctx.interval(() => {
            tick += 1
            if (tick % 15 === 1) pull()
            const next = step()
            if (alive) setView(next)
          }, 40)

          return () => { alive = false; stop() }
        }, [])

        function toggle() { setOpen((v) => !v) }

        function reset() {
          fetch(RESET_URL)
            .then(() => fetch(SNAPSHOT_URL, { cache: 'no-store' }))
            .then((r) => r.json())
            .then((v) => { if (v) setSnap(v) })
            .catch((err) => { console.error('token-cat reset failed', err) })
        }

        const t = (snap && snap.totals) || {
          tokens: 0, cost: 0, calls: 0, input: 0, output: 0,
          cacheRead: 0, cacheWrite: 0, reasoning: 0,
        }
        const busy = snap ? snap.busy === true : false
        const mood = view ? (MOODS[view.action || 'travel'] || 'on the prowl') : 'waking up'

        const grid = []
        const pairs = [
          ['Input', fmtTokens(t.input)],
          ['Output', fmtTokens(t.output)],
          ['Cache read', fmtTokens(t.cacheRead)],
          ['Cache write', fmtTokens(t.cacheWrite)],
          ['Reasoning', fmtTokens(t.reasoning)],
          ['Model calls', String(t.calls)],
        ]
        for (let i = 0; i < pairs.length; i++) {
          grid.push(el('span', { key: 'k' + i }, pairs[i][0]))
          grid.push(el('span', { key: 'v' + i }, pairs[i][1]))
        }

        const models = (snap && snap.models) || []
        const modelRows = models.slice(0, 5).map((m, i) => el('div', { className: 'dsh-tc-row', key: 'm' + i },
          el('b', null, m.model + (m.provider ? ' \u00b7 ' + m.provider : '')),
          el('i', null, fmtTokens(m.tokens) + '  ' + fmtCost(m.cost)),
        ))

        const sessions = (snap && snap.sessions) || []
        const sessionRows = sessions.slice(0, 5).map((s, i) => el('div', { className: 'dsh-tc-row', key: 's' + i },
          el('b', null, String(s.id).slice(0, 8)),
          el('i', null, fmtTokens(s.tokens) + '  ' + fmtCost(s.cost)),
        ))

        const panel = el('div', { className: 'dsh-tc-panel' },
          el('div', { className: 'dsh-tc-title' },
            el('span', null, 'Token Cat'),
            el('span', { className: 'dsh-tc-mood' }, mood),
            el('button', { className: 'dsh-tc-x', onClick: () => setOpen(false), title: 'Close' }, '\u00d7'),
          ),
          el('div', { className: 'dsh-tc-hero' },
            el('div', { className: 'dsh-tc-card' },
              el('div', { className: 'dsh-tc-k' }, 'Tokens'),
              el('div', { className: 'dsh-tc-v' }, fmtTokens(t.tokens)),
            ),
            el('div', { className: 'dsh-tc-card' },
              el('div', { className: 'dsh-tc-k' }, 'Est. cost'),
              el('div', { className: 'dsh-tc-v' }, fmtCost(t.cost)),
            ),
          ),
          el('div', { className: 'dsh-tc-grid' }, grid),
          modelRows.length
            ? el('div', { className: 'dsh-tc-sec' },
                el('div', { className: 'dsh-tc-sech' }, 'By model'),
                modelRows,
              )
            : null,
          sessionRows.length
            ? el('div', { className: 'dsh-tc-sec' },
                el('div', { className: 'dsh-tc-sech' }, 'By session'),
                sessionRows,
              )
            : null,
          sessionRows.length || modelRows.length
            ? null
            : el('div', { className: 'dsh-tc-empty' }, 'No model usage observed yet.'),
          el('div', { className: 'dsh-tc-foot' },
            el('div', { className: 'dsh-tc-note' }, (snap && snap.rateNote) || 'Waiting for model usage\u2026'),
            el('div', { className: 'dsh-tc-actions' },
              el('button', { className: 'dsh-tc-btn', onClick: reset, title: 'Zero the counters' }, 'Reset'),
              el('button', { className: 'dsh-tc-btn', onClick: () => setCatOn((v) => !v) },
                catOn ? 'Hide cat' : 'Show cat'),
            ),
          ),
        )

        const cat = view
          ? el('div', { className: 'dsh-tc-cat', onClick: toggle, title: 'Token Cat \u2014 ' + mood },
              el(CatView, { v: view, busy: busy }))
          : null

        return el('div', { className: 'dsh-tc-root' },
          catOn && cat
            ? el('div', { className: 'dsh-tc-lane', style: { transform: 'translateX(' + view.x.toFixed(2) + 'vw)' } }, cat)
            : null,
          el('div', { className: 'dsh-tc-hud' },
            open ? panel : null,
            el('button', {
              className: 'dsh-tc-pill',
              onClick: toggle,
              title: 'Token usage & estimated cost',
            },
              el('span', { className: 'dsh-tc-dot', 'data-busy': busy ? '1' : '0' }),
              el('span', null, fmtTokens(t.tokens) + ' tok'),
              el('span', { className: 'dsh-tc-sep' }, '\u00b7'),
              el('span', { className: 'dsh-tc-cost' }, fmtCost(t.cost)),
            ),
          ),
        )
      }

      slots.inject('shell.overlay', () => slots.register(
        { name: 'shell.overlay', id: 'token-cat-overlay', order: 60, label: 'Token Cat' },
        () => el(TokenCat),
      ))
    }

    exports.apply = apply
    exports.inject = ['slots', 'timer']
    return module.exports
  },
})
