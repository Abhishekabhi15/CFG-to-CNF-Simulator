import React, { useState, useEffect, useRef } from 'react';
import { GrammarInput } from '../components/GrammarInput';
import { ConversionPipeline } from '../components/ConversionPipeline';
import { TransformationViewer } from '../components/TransformationViewer';
import { PlaybackControls, PlaybackSpeed } from '../components/PlaybackControls';
import { CompleteGrammarView } from '../components/CompleteGrammarView';
import { StepsModal } from '../components/StepsModal';
import { GRAMMAR_PRESETS } from '../engine/presets';
import { parseGrammar } from '../engine/parser';
import { validateGrammar, ValidationResult } from '../engine/validator';
import { runConversionPipeline } from '../engine/pipeline';
import { PipelineResult, StageId } from '../engine/types';

export const Simulator: React.FC = () => {
  // Preset 0 is "Complete CNF Conversion Test"
  const defaultPreset = GRAMMAR_PRESETS[0];

  const [variables, setVariables] = useState<string>(defaultPreset.variables);
  const [terminals, setTerminals] = useState<string>(defaultPreset.terminals);
  const [startSymbol, setStartSymbol] = useState<string>(defaultPreset.startSymbol);
  const [productions, setProductions] = useState<string>(defaultPreset.productions);

  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidated, setIsValidated] = useState<boolean>(false);

  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>('normal');
  const [isStepsModalOpen, setIsStepsModalOpen] = useState<boolean>(false);

  const inputSectionRef = useRef<HTMLDivElement>(null);
  const viewerSectionRef = useRef<HTMLDivElement>(null);

  // Initialize pipeline on mount with default preset
  useEffect(() => {
    runPreset(defaultPreset.id);
  }, []);

  // Timer interval for playback
  useEffect(() => {
    if (!isPlaying || !pipelineResult) return;

    const intervalMap: Record<PlaybackSpeed, number> = {
      slow: 2500,
      normal: 1500,
      fast: 750
    };

    const intervalId = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= pipelineResult.steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMap[speed]);

    return () => clearInterval(intervalId);
  }, [isPlaying, speed, pipelineResult]);

  const runPreset = (presetId: string) => {
    const preset = GRAMMAR_PRESETS.find(p => p.id === presetId) || defaultPreset;
    setVariables(preset.variables);
    setTerminals(preset.terminals);
    setStartSymbol(preset.startSymbol);
    setProductions(preset.productions);

    const { grammar, errors } = parseGrammar(
      preset.variables,
      preset.terminals,
      preset.startSymbol,
      preset.productions
    );

    setParseErrors(errors);
    if (errors.length > 0) {
      setValidation(null);
      setPipelineResult(null);
      return;
    }

    const valResult = validateGrammar(grammar);
    setValidation(valResult);
    setIsValidated(true);

    if (valResult.isValid) {
      const result = runConversionPipeline(grammar);
      setPipelineResult(result);
      setCurrentStepIndex(0);
      setIsPlaying(false);
    } else {
      setPipelineResult(null);
    }
  };

  const handleValidate = () => {
    const { grammar, errors } = parseGrammar(variables, terminals, startSymbol, productions);
    setParseErrors(errors);
    if (errors.length > 0) {
      setValidation(null);
      return;
    }

    const valResult = validateGrammar(grammar);
    setValidation(valResult);
    setIsValidated(true);
  };

  const handleStartConversion = () => {
    const { grammar, errors } = parseGrammar(variables, terminals, startSymbol, productions);
    setParseErrors(errors);
    if (errors.length > 0) {
      setValidation(null);
      return;
    }

    const valResult = validateGrammar(grammar);
    setValidation(valResult);
    setIsValidated(true);

    if (valResult.isValid) {
      const result = runConversionPipeline(grammar);
      setPipelineResult(result);
      setCurrentStepIndex(0);
      setIsPlaying(false);

      setTimeout(() => {
        viewerSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const handleResetToBenchmark = () => {
    runPreset('complete-test');
    setTimeout(() => {
      inputSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handlePrevious = () => {
    setIsPlaying(false);
    setCurrentStepIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (!pipelineResult) return;
    setIsPlaying(false);
    setCurrentStepIndex(prev => Math.min(pipelineResult.steps.length - 1, prev + 1));
  };

  const handleTogglePlay = () => {
    if (!pipelineResult) return;
    if (currentStepIndex >= pipelineResult.steps.length - 1) {
      // If at end, restart from 0
      setCurrentStepIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(prev => !prev);
    }
  };

  const handleRestartStage = () => {
    if (!pipelineResult) return;
    setIsPlaying(false);
    const currentStep = pipelineResult.steps[currentStepIndex];
    if (!currentStep) return;

    // Find the first step in the same stage
    const firstStepInStage = pipelineResult.steps.findIndex(s => s.stageId === currentStep.stageId);
    if (firstStepInStage !== -1) {
      setCurrentStepIndex(firstStepInStage);
    }
  };

  const handleStartAgain = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    viewerSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectStage = (stageId: StageId) => {
    if (!pipelineResult) return;
    setIsPlaying(false);
    const firstIndex = pipelineResult.steps.findIndex(s => s.stageId === stageId);
    if (firstIndex !== -1) {
      setCurrentStepIndex(firstIndex);
    }
  };

  const handleTryAnotherGrammar = () => {
    inputSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const currentStep = pipelineResult?.steps[currentStepIndex];
  const isAtLastStep = pipelineResult && currentStepIndex === pipelineResult.steps.length - 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Input CFG Form */}
      <div ref={inputSectionRef}>
        <GrammarInput
          variables={variables}
          terminals={terminals}
          startSymbol={startSymbol}
          productions={productions}
          onVariablesChange={(v) => {
            setVariables(v);
            setIsValidated(false);
          }}
          onTerminalsChange={(t) => {
            setTerminals(t);
            setIsValidated(false);
          }}
          onStartSymbolChange={(s) => {
            setStartSymbol(s);
            setIsValidated(false);
          }}
          onProductionsChange={(p) => {
            setProductions(p);
            setIsValidated(false);
          }}
          onSelectPreset={runPreset}
          onValidate={handleValidate}
          onStartConversion={handleStartConversion}
          onReset={handleResetToBenchmark}
          validation={validation}
          isValidated={isValidated}
          parseErrors={parseErrors}
        />
      </div>

      {/* Simulator Execution Zone */}
      {pipelineResult && currentStep && (
        <div ref={viewerSectionRef} className="space-y-6 pt-4">
          {/* Conversion Pipeline Stages Bar */}
          <ConversionPipeline
            currentStageId={currentStep.stageId}
            currentStepIndex={currentStepIndex}
            totalSteps={pipelineResult.steps.length}
            onSelectStage={handleSelectStage}
          />

          {/* Transformation Step Viewer */}
          <TransformationViewer
            step={currentStep}
            stepIndex={currentStepIndex}
            totalSteps={pipelineResult.steps.length}
          />

          {/* Functional Playback Controls */}
          <PlaybackControls
            currentStepIndex={currentStepIndex}
            totalSteps={pipelineResult.steps.length}
            isPlaying={isPlaying}
            speed={speed}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onTogglePlay={handleTogglePlay}
            onChangeSpeed={setSpeed}
            onRestartStage={handleRestartStage}
            onStartAgain={handleStartAgain}
            onOpenStepModal={() => setIsStepsModalOpen(true)}
            onTryAnotherGrammar={handleTryAnotherGrammar}
          />

          {/* Complete Grammar View (always available, highlighted when at last step) */}
          <div className="pt-6">
            <CompleteGrammarView
              originalGrammar={pipelineResult.originalGrammar}
              finalGrammar={pipelineResult.finalGrammar}
              summary={pipelineResult.summary}
              verification={pipelineResult.verification}
              onStartAgain={handleStartAgain}
              onTryAnotherGrammar={handleTryAnotherGrammar}
            />
          </div>

          {/* All Steps Timeline Modal */}
          <StepsModal
            isOpen={isStepsModalOpen}
            onClose={() => setIsStepsModalOpen(false)}
            steps={pipelineResult.steps}
            currentStepIndex={currentStepIndex}
            onSelectStep={(idx) => {
              setIsPlaying(false);
              setCurrentStepIndex(idx);
            }}
          />
        </div>
      )}
    </div>
  );
};
