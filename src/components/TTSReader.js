import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, Play, Pause, Volume2, Clock, CheckCircle, XCircle, Mic, Check, X } from "lucide-react";

// ================================
// CONSTANTS
// ================================
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const FEEDBACK_TIMEOUT = 3000;
const VOICE_LOAD_DELAY = 50;

// Mock Google Cloud TTS hook since it's not available
const useGoogleCloudTTS = () => {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [errorVoices, setErrorVoices] = useState(null);

  useEffect(() => {
    // Simulate loading browser voices
    const loadVoices = () => {
      const browserVoices = window.speechSynthesis.getVoices();
      // Only include English voices
      const mockGoogleVoices = browserVoices
        .filter(voice => voice.lang && voice.lang.toLowerCase().startsWith('en'))
        .map(voice => ({
          name: voice.name,
          languageCodes: [voice.lang],
          ssmlGender: voice.name.toLowerCase().includes('female') ? 'FEMALE' : 'MALE'
        }));

      setVoices(mockGoogleVoices);
      if (mockGoogleVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(mockGoogleVoices[0]);
      }
      setLoadingVoices(false);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [selectedVoice]);

  return { voices, selectedVoice, setSelectedVoice, loadingVoices, errorVoices };
};

// ================================
// UTILITY CLASSES
// ================================
class VoiceManager {
  static loadedVoices = [];
  static voicesReady = false;
  static voicesCallbacks = [];
  static listenerAdded = false;

  static fireCallbacks(voices) {
    this.voicesCallbacks.forEach(cb => cb(voices));
    this.voicesCallbacks = [];
  }

  static loadVoices(callback) {
    if (this.voicesReady && this.loadedVoices.length > 0) {
      callback(this.loadedVoices);
      return;
    }

    this.loadedVoices = window.speechSynthesis.getVoices();
    if (this.loadedVoices.length > 0) {
      this.voicesReady = true;
      callback(this.loadedVoices);
      return;
    }

    this.voicesCallbacks.push(callback);
    if (!this.listenerAdded) {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        this.loadedVoices = window.speechSynthesis.getVoices();
        this.voicesReady = true;
        this.fireCallbacks(this.loadedVoices);
      });
      this.listenerAdded = true;
    }
  }
}

class BrowserTTS {
  static speak(text, voice, rate = 1, onProgress, onEnd, onError, setAudioError) {
    if (!window.speechSynthesis || !text?.trim()) {
      onError?.('Speech synthesis not available or invalid text');
      return;
    }

    if (window.speechSynthesis.speaking || window.speechSynthesis.paused) {
      window.speechSynthesis.cancel();
    }

    setTimeout(() => {
      VoiceManager.loadVoices((voices) => {
        const utterance = new window.SpeechSynthesisUtterance(text);

        if (voice?.name) {
          const match = voices.find(v => v.name === voice.name);
          if (match) utterance.voice = match;
        }

        utterance.rate = rate;
        utterance.onboundary = (event) => {
          if ((event.name === "word" || event.charIndex !== undefined) && text) {
            onProgress?.(text, event.charIndex);
          }
        };
        utterance.onend = onEnd;
        utterance.onerror = (e) => {
          if (typeof setAudioError === 'function') {
            setAudioError('Browser TTS failed: ' + (e.error || e.message || 'Unknown error'));
          }
          onError?.(e.error || e.message || 'Unknown error');
        };

        try {
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          onError?.(err.message || 'Unknown error');
        }
      });
    }, VOICE_LOAD_DELAY);
  }

  static stop() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  static pause() {
    if (window.speechSynthesis?.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
    }
  }

  static resume() {
    if (window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
    }
  }
}

// ================================
// CUSTOM HOOKS
// ================================
const useTTSProgress = () => {
  const [progressText, setProgressText] = useState("");
  
  const updateProgress = useCallback((text, charIndex) => {
    if (text && charIndex !== undefined) {
      setProgressText(text.slice(0, charIndex));
    }
  }, []);
  
  const resetProgress = useCallback(() => setProgressText(""), []);
  
  return { progressText, updateProgress, resetProgress };
};

const useAnswerModal = (onTimeout) => {
  const [showModal, setShowModal] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(5);

  // Countdown timer effect
  React.useEffect(() => {
    if (!showModal) return;
    if (timeRemaining <= 0) {
      setShowModal(false);
      setUserAnswer("");
      if (typeof onTimeout === 'function') onTimeout();
      return;
    }
    const interval = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [showModal, timeRemaining, onTimeout]);

  const openModal = useCallback(() => {
    setShowModal(true);
    setUserAnswer("");
    setTimeRemaining(5);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setUserAnswer("");
  }, []);

  return {
    showModal,
    userAnswer,
    setUserAnswer,
    timeRemaining,
    openModal,
    closeModal
  };
};

const useFeedback = () => {
  const [feedback, setFeedback] = useState({ show: false, isCorrect: false, message: '' });
  
  const showFeedback = useCallback((isCorrect, message) => {
    setFeedback({ show: true, isCorrect, message });
    setTimeout(() => {
      setFeedback(prev => ({ ...prev, show: false }));
    }, FEEDBACK_TIMEOUT);
  }, []);
  
  const hideFeedback = useCallback(() => {
    setFeedback(prev => ({ ...prev, show: false }));
  }, []);
  
  return { feedback, showFeedback, hideFeedback };
};

const useQuestionNavigation = (questions, resetProgress) => {
  const [questionIdx, setQuestionIdx] = useState(0);
  
  const goToPreviousQuestion = useCallback(() => {
    setQuestionIdx(i => Math.max(0, i - 1));
    resetProgress();
  }, [resetProgress]);
  
  const goToNextQuestion = useCallback(() => {
    setQuestionIdx(i => {
      const maxIndex = Math.max(0, (questions?.length || 1) - 1);
      return Math.min(maxIndex, i + 1);
    });
    resetProgress();
  }, [questions, resetProgress]);
  
  return {
    questionIdx,
    setQuestionIdx,
    goToPreviousQuestion,
    goToNextQuestion
  };
};

const useAudioPlayback = (currentQuestion, selectedVoice, rate, updateProgress, resetProgress) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [resumeCharIndex, setResumeCharIndex] = useState(null);
  
  const playBrowserTTS = useCallback((startCharIndex = 0) => {
    if (!currentQuestion?.text) return;
    
    const textToRead = currentQuestion.text.slice(startCharIndex);
    BrowserTTS.speak(
      textToRead,
      selectedVoice,
      rate,
      (text, charIndex) => {
        updateProgress(currentQuestion.text, startCharIndex + charIndex);
      },
      () => {
        setIsPlaying(false);
        resetProgress();
        setResumeCharIndex(null);
      },
      () => {
        setIsPlaying(false);
        resetProgress();
        setResumeCharIndex(null);
      },
      setAudioError
    );
    setIsPlaying(true);
  }, [currentQuestion, selectedVoice, rate, updateProgress, resetProgress]);

  const handlePlayPause = useCallback(() => {
    setAudioError(null);
    
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    
    playBrowserTTS();
  }, [isPlaying, playBrowserTTS]);
  
  return {
    isPlaying,
    audioError,
    resumeCharIndex,
    setResumeCharIndex,
    playBrowserTTS,
    handlePlayPause
  };
};

// ================================
// COMPONENTS
// ================================
const LoadingState = () => (
  <div className="bg-gray-900 rounded-xl p-6 shadow-lg max-w-2xl mx-auto mt-6 text-center">
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-gray-800 rounded w-3/4 mx-auto"></div>
      <div className="h-4 bg-gray-800 rounded w-1/2 mx-auto"></div>
    </div>
  </div>
);

const ErrorState = ({ error }) => (
  <div className="bg-gray-900 rounded-xl p-6 shadow-lg max-w-2xl mx-auto mt-6 text-center">
    <div className="text-red-500 mb-4">Error: {error.message}</div>
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Retry
    </button>
  </div>
);

const EmptyState = () => (
  <div className="bg-gray-900 rounded-xl p-6 shadow-lg max-w-2xl mx-auto mt-6 text-center">
    <h3 className="text-xl font-semibold text-gray-200 mb-2">No Questions Available</h3>
    <p className="text-gray-400 mb-4">There are no questions to display.</p>
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Refresh
    </button>
  </div>
);

const VoiceSelector = ({ 
  showVoiceSelector, 
  setShowVoiceSelector, 
  selectedVoice, 
  setSelectedVoice, 
  googleVoices, 
  loadingVoices, 
  errorVoices 
}) => (
  <div className="relative">
    <button
      onClick={() => setShowVoiceSelector(!showVoiceSelector)}
      className="flex items-center space-x-1 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-sm text-gray-200"
    >
      <span>{selectedVoice?.name || 'Select Voice'}</span>
      <ChevronDown className={`w-4 h-4 transition-transform ${showVoiceSelector ? 'rotate-180' : ''}`} />
    </button>
    
    {showVoiceSelector && (
      <div className="absolute bottom-full mb-2 left-0 w-64 bg-gray-800 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
        {loadingVoices ? (
          <div className="p-2 text-center text-gray-400 text-sm">Loading voices...</div>
        ) : errorVoices ? (
          <div className="p-2 text-center text-red-400 text-sm">Error loading voices</div>
        ) : (
          <ul className="py-1">
            {googleVoices.map((voice) => (
              <li
                key={voice.name}
                onClick={() => {
                  setSelectedVoice(voice);
                  setShowVoiceSelector(false);
                }}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-700 ${
                  selectedVoice?.name === voice.name 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-200'
                }`}
              >
                {voice.name} ({voice.languageCodes[0]})
              </li>
            ))}
          </ul>
        )}
      </div>
    )}
  </div>
);

const SpeedControl = ({ showSpeedControls, setShowSpeedControls, rate, setRate }) => (
  <div className="relative">
    <button
      onClick={() => setShowSpeedControls(!showSpeedControls)}
      className="flex items-center space-x-1 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-sm text-gray-200"
    >
      <span>{rate}x</span>
      <ChevronDown className={`w-4 h-4 transition-transform ${showSpeedControls ? 'rotate-180' : ''}`} />
    </button>
    
    {showSpeedControls && (
      <div className="absolute bottom-full mb-2 right-0 w-24 bg-gray-800 rounded-lg shadow-lg z-10 py-1">
        {SPEED_OPTIONS.map((speed) => (
          <button
            key={speed}
            onClick={() => {
              setRate(speed);
              setShowSpeedControls(false);
            }}
            className={`block w-full text-left px-4 py-2 text-sm ${
              rate === speed ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-700'
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>
    )}
  </div>
);

const QuestionNavigation = ({ questionIdx, goToPreviousQuestion, goToNextQuestion, totalQuestions }) => (
  <div className="flex justify-between items-center bg-gray-800 p-2 rounded-lg mb-4">
    <button
      onClick={goToPreviousQuestion}
      disabled={questionIdx === 0}
      className={`p-2 rounded-full ${
        questionIdx === 0 ? 'text-gray-500' : 'text-white hover:bg-gray-700'
      }`}
    >
      <ChevronUp className="w-5 h-5" />
    </button>
    <span className="text-sm font-medium text-gray-300">
      Question {questionIdx + 1} of {totalQuestions}
    </span>
    <button
      onClick={goToNextQuestion}
      disabled={questionIdx >= totalQuestions - 1}
      className={`p-2 rounded-full ${
        questionIdx >= totalQuestions - 1 ? 'text-gray-500' : 'text-white hover:bg-gray-700'
      }`}
    >
      <ChevronDown className="w-5 h-5" />
    </button>
  </div>
);

const QuestionDisplay = ({ currentQuestion, progressText }) => (
  <div className="mb-6">
    <div className="bg-gray-800 rounded-lg p-4 min-h-32">
      {currentQuestion?.text ? (
        <p className="text-gray-100 whitespace-pre-line">
          <span className="bg-yellow-200 text-gray-900">{progressText}</span>
          <span className="text-gray-100">
            {currentQuestion.text.slice(progressText.length)}
          </span>
        </p>
      ) : (
        <p className="text-gray-400 italic">No question text available</p>
      )}
    </div>
  </div>
);

const FeedbackBanner = ({ feedback }) => {
  if (!feedback.show) return null;
  
  return (
    <div 
      className={`absolute -top-4 left-1/2 transform -translate-x-1/2 -translate-y-full w-full max-w-md px-4 py-3 rounded-lg text-white font-medium text-center ${
        feedback.isCorrect ? 'bg-green-600' : 'bg-red-600'
      } transition-all duration-300 ease-in-out z-10 shadow-lg`}
    >
      <div className="flex items-center justify-center space-x-2">
        {feedback.isCorrect ? (
          <CheckCircle className="w-5 h-5" />
        ) : (
          <XCircle className="w-5 h-5" />
        )}
        <span>{feedback.message}</span>
      </div>
    </div>
  );
};

const AnswerModal = ({ 
  showModal, 
  userAnswer, 
  setUserAnswer, 
  timeRemaining, 
  handleSubmitAnswer, 
  onCancel 
}) => {
  const answerInputRef = useRef(null);
  
  useEffect(() => {
    if (showModal && answerInputRef.current) {
      answerInputRef.current.focus();
    }
  }, [showModal]);
  
  if (!showModal) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">Your Answer</h3>
          <div className="flex items-center text-yellow-400">
            <Clock className="w-5 h-5 mr-1" />
            <span className="font-mono">{timeRemaining}s</span>
          </div>
        </div>
        
        <input
          ref={answerInputRef}
          type="text"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && userAnswer.trim()) {
              handleSubmitAnswer();
            }
          }}
          className="w-full p-4 bg-gray-700 text-white text-lg rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          placeholder="Type your answer..."
        />
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitAnswer}
            disabled={!userAnswer.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Check className="w-5 h-5" /> Submit
          </button>
        </div>
      </div>
    </div>
  );
};

// ================================
// MAIN COMPONENT
// ================================
export default function TTSReader({ questions = [], loading = false, error = null }) {
  // UI State
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [showSpeedControls, setShowSpeedControls] = useState(false);
  const [rate, setRate] = useState(1);
  const [buzzed, setBuzzed] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  
  // Custom hooks
  const { progressText, updateProgress, resetProgress } = useTTSProgress();
  const { feedback, showFeedback } = useFeedback();

  // Pass resetProgress to useQuestionNavigation
  const questionNav = useQuestionNavigation(questions, resetProgress);
  const { questionIdx, goToPreviousQuestion, goToNextQuestion } = questionNav;

  // Derived state
  const hasQuestions = Array.isArray(questions) && questions.length > 0;
  const currentQuestion = hasQuestions ? questions[questionIdx] : null;

  const {
    showModal,
    userAnswer,
    setUserAnswer,
    timeRemaining,
    openModal,
    closeModal
  } = useAnswerModal(
    React.useCallback(() => {
      // Timer expired: show feedback and answer
      if (currentQuestion) {
        showFeedback(false, `Time's up! The answer is: ${currentQuestion.answer || 'Not available'}`);
      }
      setIsAnswering(false);
      setBuzzed(false);
      setResumeCharIndex(null);
    }, [currentQuestion, showFeedback])
  );
  
  // Google Cloud TTS hook
  const {
    voices: googleVoices,
    selectedVoice,
    setSelectedVoice,
    loadingVoices,
    errorVoices,
  } = useGoogleCloudTTS();
  
  // Audio playback
  const {
    isPlaying,
    audioError,
    resumeCharIndex,
    setResumeCharIndex,
    playBrowserTTS,
    handlePlayPause
  } = useAudioPlayback(currentQuestion, selectedVoice, rate, updateProgress, resetProgress);
  
  // Event handlers
  const handleBuzz = useCallback(() => {
    BrowserTTS.pause();
    setBuzzed(true);
    setResumeCharIndex(progressText.length);
    openModal();
  }, [openModal, progressText.length]);
  
  const handleSubmitAnswer = useCallback(() => {
    if (!userAnswer.trim()) return;
    
    const isCorrect = currentQuestion?.answer?.toLowerCase().includes(userAnswer.toLowerCase()) ||
                     userAnswer.toLowerCase().includes(currentQuestion?.answer?.toLowerCase());
    
    showFeedback(
      isCorrect,
      isCorrect
        ? `Correct! The answer is: ${currentQuestion?.answer || 'Not available'}`
        : `Incorrect. The answer is: ${currentQuestion?.answer || 'Not available'}`
    );
    
    closeModal();
    setIsAnswering(false);
    setBuzzed(false);
    setUserAnswer("");
    resetProgress();

    if (!isCorrect && resumeCharIndex !== null) {
      playBrowserTTS(resumeCharIndex);
    } else {
      setResumeCharIndex(null);
    }
  }, [userAnswer, currentQuestion, showFeedback, closeModal, resumeCharIndex, playBrowserTTS]);
  
  const handleModalCancel = useCallback(() => {
    closeModal();
    setIsAnswering(false);
    setBuzzed(false);
  }, [closeModal]);
  
  // Keyboard events
  useEffect(() => {
    const onKeyDown = (e) => {
      // Prevent buzz if focus is inside a text input or textarea
      const tag = document.activeElement.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handleBuzz();
      }
    };
    
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBuzz]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      BrowserTTS.stop();
    };
  }, []);

  // Demo data for testing
  const demoQuestions = [
    {
      text: "This American inventor is known for creating the first practical incandescent light bulb and founding General Electric. Who is this person?",
      answer: "Thomas Edison"
    },
    {
      text: "What is the capital city of France, known for its iconic Eiffel Tower and rich cultural heritage?",
      answer: "Paris"
    },
    {
      text: "This programming language, created by Guido van Rossum, is known for its simple syntax and is widely used in data science and web development.",
      answer: "Python"
    }
  ];

  const questionsToUse = hasQuestions ? questions : demoQuestions;
  const currentQuestionToUse = questionsToUse[questionIdx] || demoQuestions[0];
  
  // Early returns for different states
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  
  return (
    <div className="relative bg-gray-900 rounded-xl p-6 shadow-lg max-w-2xl mx-auto mt-6 transition-all duration-300">
      {/* Error banner */}
      {audioError && (
        <div className="mb-4 p-3 rounded bg-red-800 text-white text-center font-semibold">
          {audioError}
        </div>
      )}
      
      {/* Feedback banner */}
      <FeedbackBanner feedback={feedback} />
      
      <div className={`transition-opacity duration-300 ${buzzed ? 'opacity-50' : 'opacity-100'}`}>
        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <VoiceSelector 
            showVoiceSelector={showVoiceSelector}
            setShowVoiceSelector={setShowVoiceSelector}
            selectedVoice={selectedVoice}
            setSelectedVoice={setSelectedVoice}
            googleVoices={googleVoices}
            loadingVoices={loadingVoices}
            errorVoices={errorVoices}
          />
          
          <SpeedControl
            showSpeedControls={showSpeedControls}
            setShowSpeedControls={setShowSpeedControls}
            rate={rate}
            setRate={setRate}
          />
        </div>
        
        {/* Question navigation */}
        <QuestionNavigation
          questionIdx={questionIdx}
          goToPreviousQuestion={goToPreviousQuestion}
          goToNextQuestion={goToNextQuestion}
          totalQuestions={questionsToUse.length}
        />
        
        {/* Question content */}
        <QuestionDisplay 
          currentQuestion={currentQuestionToUse}
          progressText={progressText}
        />
        
        {/* Main controls */}
        <div className="flex justify-center items-center space-x-6 mb-6">
          <button
            onClick={handlePlayPause}
            className={`p-4 rounded-full ${
              isPlaying
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            } text-white transition-colors`}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
        </div>
        
        {/* Navigation and buzz buttons */}
        <div className="flex justify-center space-x-4 w-full">
          <button
            onClick={goToPreviousQuestion}
            disabled={questionIdx === 0}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <button
            onClick={handleBuzz}
            className="px-6 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 flex items-center gap-2"
          >
            <Mic className="w-5 h-5" />
            <span>Buzz In</span>
          </button>
          <button
            onClick={goToNextQuestion}
            disabled={questionIdx >= questionsToUse.length - 1}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
      
      {/* Answer Modal */}
      <AnswerModal
        showModal={showModal}
        userAnswer={userAnswer}
        setUserAnswer={setUserAnswer}
        timeRemaining={timeRemaining}
        handleSubmitAnswer={handleSubmitAnswer}
        onCancel={handleModalCancel}
      />
      
      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Instructions:</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Press the Play button or spacebar to start reading</li>
          <li>• Click "Buzz In" or press spacebar to interrupt and answer</li>
          <li>• Use voice selector to change TTS voice</li>
          <li>• Adjust speed with the speed control</li>
        </ul>
      </div>
    </div>
  );
}