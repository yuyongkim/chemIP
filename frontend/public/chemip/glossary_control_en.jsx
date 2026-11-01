// 용어사전 자료 · 공정제어·계측 — 영어판. 키와 순서는 glossary_control.jsx 와 같습니다.
// 한국어에 한글이 들어간 필드(term·def·alias)만 둡니다. exams·calc·see·src·ref 는 한국어 파일에서 읽습니다.

const GLOSSARY_CONTROL_EN = {
  // Control system elements
  controlled_variable: {
    term: "Controlled variable",
    alias: ["process variable", "CV", "PV"],
    def: "The process output to be held at its target. Temperature, pressure, level, flow and composition are typical; its measured value (PV) is fed back to the controller.",
  },
  manipulated_variable: {
    term: "Manipulated variable",
    alias: ["controller output", "MV"],
    def: "The input the controller adjusts directly to bring the controlled variable to its setpoint, usually a flow of cooling water, steam or feed set through a control valve opening.",
  },
  disturbance: {
    term: "Disturbance",
    alias: ["load variable", "load", "disturbance variable"],
    def: "An input that affects the controlled variable but cannot be adjusted by the controller, such as changes in feed temperature or composition or ambient temperature. If it can be measured, it can be used for feedforward control.",
  },
  setpoint: {
    term: "Setpoint",
    alias: ["target value", "SP", "set point"],
    def: "The desired value of the controlled variable. The controller changes the manipulated variable to reduce the error e = SP - PV.",
  },
  process_gain: {
    term: "Process gain",
    alias: ["steady-state gain", "gain", "K"],
    def: "The change in output at the new steady state divided by the size of a step change in input (K = Δy/Δu). It equals the transfer function evaluated as s → 0.",
  },

  // Control structures
  feedback_control: {
    term: "Feedback control",
    alias: ["closed-loop control", "feedback loop"],
    def: "Control that measures the controlled variable, compares it with the setpoint and adjusts the manipulated variable according to the error. It corrects disturbances of unknown origin but acts only after an error has appeared, so correction lags.",
  },
  feedforward_control: {
    term: "Feedforward control",
    alias: ["feed-forward control", "anticipatory control"],
    def: "Control that measures a disturbance directly and adjusts the manipulated variable before its effect reaches the controlled variable. It depends on model accuracy and cannot correct unmeasured disturbances, so it is normally combined with feedback.",
  },
  cascade_control: {
    term: "Cascade control",
    alias: ["master-slave control", "multi-loop cascade", "cascade"],
    def: "A two-loop structure in which the output of the primary (master) controller becomes the setpoint of the secondary (slave) controller. The secondary loop must be much faster than the primary; it removes disturbances entering the inner loop, such as steam pressure swings, before they affect the primary variable.",
  },
  ratio_control: {
    term: "Ratio control",
    alias: ["flow ratio control", "ratio control"],
    def: "Control that keeps the ratio of two flows constant. The measured wild stream is multiplied by the desired ratio and sent as the setpoint to the flow controller of the dependent stream; used for fuel-air ratio and blending. It can be viewed as a form of feedforward control.",
  },

  // Control actions
  proportional_action: {
    term: "Proportional action",
    alias: ["P action", "proportional band", "PB"],
    def: "Action that changes the output in proportion to the error (p = p̄ + Kc·e). The proportional band PB (%) is 100/Kc for a dimensionless gain, so a narrower band means a higher gain. Proportional action alone leaves an offset for most processes.",
  },
  integral_action: {
    term: "Integral action",
    alias: ["I action", "reset action", "integral time"],
    def: "Action that changes the output in proportion to the time integral of the error; because the output keeps moving until the error is zero, it removes offset. A smaller integral time τI gives stronger integral action, and too much increases oscillation and instability.",
  },
  derivative_action: {
    term: "Derivative action",
    alias: ["D action", "rate action", "derivative time"],
    def: "Action that changes the output in proportion to the rate of change of the error, anticipating error growth to stabilize the response and reduce overshoot. It amplifies measurement noise, so it is seldom used on noisy loops such as flow and is paired with a filter.",
  },
  pid_controller: {
    term: "PID controller",
    alias: ["proportional-integral-derivative control", "PI controller", "three-mode controller"],
    def: "A controller combining proportional, integral and derivative actions; the ideal form is Gc(s) = Kc[1 + 1/(τI·s) + τD·s]. Most loops in the process industries use PI or PID control.",
  },
  control_offset: {
    term: "Offset",
    alias: ["steady-state error", "residual error", "offset"],
    def: "The difference between setpoint and controlled variable that remains at the new steady state after a setpoint change or disturbance. Proportional-only control of a self-regulating process leaves an offset, which integral action removes. Raising the proportional gain reduces it but increases oscillation.",
  },
  integral_windup: {
    term: "Integral windup",
    alias: ["reset windup", "windup", "anti-windup"],
    def: "When the manipulated variable saturates (for example a fully open valve) and the error persists, the integral term keeps accumulating, causing large overshoot and slow recovery once saturation ends. Anti-windup schemes stop or back-calculate integration during saturation.",
  },

  // Dynamic analysis
  laplace_transform: {
    term: "Laplace transform",
    alias: ["Laplace", "s-domain"],
    def: "The integral transform F(s) = ∫₀^∞ f(t)·e^(-st) dt. It turns linear ordinary differential equations into algebraic equations, easing derivation of transfer functions and responses; the final value theorem lim(t→∞) f(t) = lim(s→0) s·F(s) gives steady-state values.",
  },
  transfer_function: {
    term: "Transfer function",
    alias: ["transfer function", "G(s)"],
    def: "The Laplace transform of the output divided by that of the input, in deviation variables with zero initial conditions (G(s) = Y(s)/U(s)). It describes the input-output dynamics of a linear or linearized system, and block diagrams connect transfer functions to analyse the whole loop.",
  },
  first_order_system: {
    term: "First-order system",
    alias: ["first-order process", "first-order lag"],
    def: "A system with G(s) = K/(τs + 1). Its step response approaches the final value exponentially without overshoot, reaching 63.2% of the final change at t = τ and about 98% at t = 4τ. Stirred tanks and thermocouples are approximately first order.",
  },
  time_constant: {
    term: "Time constant",
    alias: ["time constant", "τ", "tau"],
    def: "The parameter setting the speed of a first-order system: the time for the step response to reach 63.2% of its final change. It has a physical meaning, such as resistance times capacitance for a level tank or volume over flow for a mixing tank.",
  },
  second_order_system: {
    term: "Second-order system",
    alias: ["second-order process", "second-order system"],
    def: "A system with G(s) = K/(τ²s² + 2ζτs + 1). Depending on the damping coefficient ζ it is overdamped (ζ > 1), critically damped (ζ = 1) or underdamped and oscillatory (0 < ζ < 1). Two first-order lags in series or a PI-controlled closed loop show this kind of response.",
  },
  damping_coefficient: {
    term: "Damping coefficient",
    alias: ["damping ratio (zeta)", "zeta"],
    def: "The dimensionless coefficient ζ that sets how quickly oscillations die out in a second-order system. Smaller ζ gives a faster response with more overshoot and oscillation; about 0.4-0.8 is a practical compromise.",
  },
  control_overshoot: {
    term: "Overshoot",
    alias: ["percent overshoot", "overshoot"],
    def: "The maximum amount by which an underdamped step response exceeds its final value, divided by the final change. For a second-order system OS = exp(-πζ/√(1 - ζ²)), determined by the damping coefficient alone.",
  },
  decay_ratio: {
    term: "Decay ratio",
    alias: ["decay rate", "decay ratio", "quarter decay"],
    def: "The ratio of successive peak excursions (second over first) in an underdamped response. For a second-order system it equals the square of the overshoot; quarter-decay was a classic tuning target. It should not be confused with the damping coefficient ζ.",
  },
  rise_time_settling_time: {
    term: "Rise time and settling time",
    alias: ["rise time", "settling time", "response time"],
    def: "Rise time is the time for a step response to first reach its final value (or to go from 10% to 90%); settling time is the time after which the response stays within ±5% (or ±2%) of the final value. Definitions vary between textbooks, so the criterion should be stated.",
  },
  dead_time: {
    term: "Dead time",
    alias: ["transport lag", "time delay", "dead time"],
    def: "The pure delay θ between an input change and the start of the output response, with transfer function e^(-θs). It arises from piping transport, analyser sampling and similar, adds phase lag and limits achievable controller gain. Processes with long dead time may call for a Smith predictor or similar.",
  },

  // Stability and frequency response
  routh_hurwitz: {
    term: "Routh-Hurwitz stability criterion",
    alias: ["Routh criterion", "Routh array", "characteristic equation"],
    def: "A method that builds the Routh array from the coefficients of the closed-loop characteristic equation 1 + G_OL(s) = 0 to judge stability without finding the roots. The system is stable if all elements in the first column have the same sign; the number of sign changes equals the number of right-half-plane roots. It cannot be applied to systems with dead time without an approximation.",
  },
  bode_plot: {
    term: "Bode plot",
    alias: ["Bode diagram", "frequency response"],
    def: "A pair of plots of amplitude ratio (log scale) and phase angle against the frequency ω of a sinusoidal input. Amplitude ratios of elements in series multiply (add on a log scale) and phases add, making open-loop stability margins easy to read.",
  },
  gain_margin: {
    term: "Gain margin",
    alias: ["GM", "gain margin"],
    def: "The reciprocal of the amplitude ratio AR_c at the frequency where the open-loop phase is -180° (the phase crossover frequency), GM = 1/AR_c. It shows by what factor the gain could rise before instability; 1.7-2.0 or more is usually recommended.",
  },
  phase_margin: {
    term: "Phase margin",
    alias: ["PM", "phase margin"],
    def: "180° plus the phase angle φ at the frequency where the open-loop amplitude ratio is 1 (the gain crossover frequency), PM = 180° + φ. It shows how much extra phase lag, such as added dead time, can be tolerated; 30-45° or more is usually recommended.",
  },
  ziegler_nichols: {
    term: "Ziegler-Nichols tuning",
    alias: ["Ziegler-Nichols", "ultimate gain method", "ZN tuning"],
    def: "A method that raises the gain under proportional-only control until sustained oscillation appears, giving the ultimate gain Ku and ultimate period Pu, then sets the controller constants: P: Kc = 0.5Ku; PI: Kc = 0.45Ku, τI = Pu/1.2; PID: Kc = 0.6Ku, τI = Pu/2, τD = Pu/8. It aims at quarter decay, so the response is rather aggressive.",
  },

  // Final control elements and instrumentation
  control_valve: {
    term: "Control valve",
    alias: ["regulating valve", "control valve", "final control element"],
    def: "The final control element that adjusts flow by changing its opening in response to the controller signal; it consists of an actuator, a valve body and a positioner. Flow characteristics include linear, equal percentage and quick opening; equal percentage is common where the pressure drop varies widely.",
  },
  valve_fail_position: {
    term: "Control valve fail position (fail-open / fail-close)",
    alias: ["fail-open", "fail-close", "air-to-open", "air-to-close", "FO", "FC"],
    def: "The position a valve takes when instrument air or signal is lost. An air-to-open valve fails closed (FC) and an air-to-close valve fails open (FO). The choice follows the safe direction for the process, e.g. FO for cooling water to an exothermic reactor and FC for fuel gas to a furnace.",
  },
  valve_cv: {
    term: "Valve flow coefficient Cv",
    alias: ["Cv", "flow coefficient", "Kv (valve)"],
    def: "A coefficient expressing a valve's flow capacity: the flow of 60 °F water in US gal/min at a pressure drop of 1 psi. For liquids q = Cv·√(ΔP/SG); in SI the Kv coefficient based on m³/h and bar is used, with Cv ≈ 1.156 Kv.",
  },
  instrument_symbols: {
    term: "Instrument symbols (P&ID)",
    alias: ["instrumentation symbols", "tag number", "ISA 5.1", "FIC", "TIC"],
    def: "The convention for showing instruments on a P&ID with circle (balloon) symbols and letter tags. The first letter is the measured variable (F flow, L level, P pressure, T temperature, A analysis) and the succeeding letters the function (I indicate, R record, C control, T transmit, A alarm, V valve), so FIC is a flow indicating controller. A horizontal line through the circle distinguishes a main control room location from field mounting.",
  },
  dcs: {
    term: "DCS",
    alias: ["distributed control system"],
    def: "A system that places multiple controllers throughout the process and connects them by a network to operator consoles for monitoring and control. A failure in one controller does not spread to the whole plant, and redundant controllers and networks are common. It is configured independently of the safety instrumented system (SIS).",
  },
};

Object.assign(window, { GLOSSARY_CONTROL_EN });
