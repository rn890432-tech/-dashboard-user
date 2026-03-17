import React, { useState } from 'react';
import ChatPanel from './ChatPanel';
import CopilotInput from './CopilotInput';
import MealPlanner from './MealPlanner';

export default function RecipeCopilot({ aiService }) {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Welcome to CyberChef AI Copilot! Ask me anything about recipes, nutrition, or meal planning.' }
  ]);
  const [mealPlan, setMealPlan] = useState(null);

  const sendMessage = async (input) => {
    setMessages([...messages, { role: 'user', content: input }]);
    // Call AI endpoint
    const res = await aiService.chat({ messages: [...messages, { role: 'user', content: input }] });
    setMessages([...messages, { role: 'user', content: input }, { role: 'assistant', content: res.reply }]);
    if (res.mealPlan) setMealPlan(res.mealPlan);
  };

  return (
    <div className="bg-white shadow rounded p-4 max-w-xl mx-auto">
      <ChatPanel messages={messages} />
      <CopilotInput onSend={sendMessage} />
      {mealPlan && <MealPlanner plan={mealPlan} />}
    </div>
  );
}
