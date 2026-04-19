import React, { useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button, StyleSheet, Text, View, ScrollView } from 'react-native';
import { ButtonGroup } from 'react-native-elements';

const Stack = createNativeStackNavigator();

/*
Sample correct answers:
1) Which 2023 film won the Oscar for Best Picture? -> 1
2) Which artists performed at the Super Bowl halftime show in the 2020s? -> [0, 1, 2]
3) The TV series "The Last of Us" premiered in 2023. -> 0
*/
const SAMPLE_QUESTIONS = [
    {
        prompt: 'Which 2023 film won the Oscar for Best Picture?',
        type: 'multiple-choice',
        choices: ['Barbie', 'Oppenheimer', 'Killers of the Flower Moon', 'Poor Things'],
        correct: 1,
    },
    {
        prompt: 'Which artists performed at the Super Bowl halftime show in the 2020s?',
        type: 'multiple-answer',
        choices: ['Rihanna', 'Usher', 'The Weeknd', 'Olivia Rodrigo'],
        correct: [0, 1, 2],
    },
    {
        prompt: 'The TV series "The Last of Us" premiered in 2023.',
        type: 'true-false',
        choices: ['True', 'False'],
        correct: 0,
    },
];

const getCorrectIndexes = (question) =>
    Array.isArray(question.correct) ? question.correct : [question.correct];

const normalizeSelection = (selection) => {
    if (Array.isArray(selection)) {
        return [...selection].map((value) => Number(value)).sort((a, b) => a - b);
    }
    if (selection === null || selection === undefined) {
        return selection;
    }
    return Number(selection);
};

const isCorrect = (question, selected) => {
    const normalizedSelected = normalizeSelection(selected);
    const isMultipleAnswerQuestion = Array.isArray(question.correct);

    if (isMultipleAnswerQuestion) {
        const normalizedCorrect = normalizeSelection(question.correct);
        if (!Array.isArray(normalizedSelected)) {
            return false;
        }
        if (normalizedCorrect.length !== normalizedSelected.length) {
            return false;
        }
        return normalizedCorrect.every((value, index) => value === normalizedSelected[index]);
    }

    return normalizedSelected === question.correct;
};

export function Question({ navigation, route }) {
    const { data, currentIndex = 0, answers = [] } = route.params;
    const question = data[currentIndex];
    const isMultipleAnswer = question.type === 'multiple-answer';

    const [selectedIndex, setSelectedIndex] = useState(null);
    const [selectedIndexes, setSelectedIndexes] = useState([]);

    const canProceed = isMultipleAnswer ? selectedIndexes.length > 0 : selectedIndex !== null;

    const onChoiceChange = (value) => {
        if (isMultipleAnswer) {
            if (Array.isArray(value)) {
                setSelectedIndexes(value);
                return;
            }

            setSelectedIndexes((previous) => {
                if (previous.includes(value)) {
                    return previous.filter((index) => index !== value);
                }
                return [...previous, value];
            });
            return;
        }

        setSelectedIndex(value);
    };

    const onNextQuestion = () => {
        const selectedAnswer = isMultipleAnswer
            ? normalizeSelection(selectedIndexes)
            : selectedIndex;

        const nextAnswers = [...answers];
        nextAnswers[currentIndex] = selectedAnswer;

        if (currentIndex < data.length - 1) {
            navigation.replace('Question', {
                data,
                currentIndex: currentIndex + 1,
                answers: nextAnswers,
            });
            return;
        }

        navigation.replace('Summary', {
            data,
            answers: nextAnswers,
        });
    };

    return (
        <View style={styles.screen}>
            <View style={styles.content}>
                <Text style={styles.progressText}>
                    Question {currentIndex + 1} of {data.length}
                </Text>
                <Text style={styles.prompt}>{question.prompt}</Text>

                <ButtonGroup
                    testID="choices"
                    buttons={question.choices}
                    vertical
                    selectMultiple={isMultipleAnswer}
                    selectedIndex={isMultipleAnswer ? undefined : selectedIndex ?? -1}
                    selectedIndexes={isMultipleAnswer ? selectedIndexes : undefined}
                    onPress={onChoiceChange}
                    containerStyle={styles.choiceGroup}
                    buttonStyle={styles.choiceButton}
                    selectedButtonStyle={styles.choiceSelectedButton}
                    textStyle={styles.choiceText}
                    selectedTextStyle={styles.choiceSelectedText}
                />

                <Button
                    testID="next-question"
                    title={currentIndex < data.length - 1 ? 'Next Question' : 'Finish Quiz'}
                    onPress={onNextQuestion}
                    disabled={!canProceed}
                    color="#1f2937"
                />
            </View>
        </View>
    );
}

export function Summary({ route }) {
    const { data, answers = [] } = route.params;

    const score = useMemo(() => {
        return data.reduce((total, question, index) => {
            return total + (isCorrect(question, answers[index]) ? 1 : 0);
        }, 0);
    }, [answers, data]);

    return (
        <ScrollView contentContainerStyle={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Quiz Summary</Text>
            <Text testID="total" style={styles.totalText}>
                Total: {score} / {data.length}
            </Text>

            {data.map((question, index) => {
                const selected = answers[index];
                const selectedArray = Array.isArray(selected) ? selected : [selected];
                const correctIndexes = getCorrectIndexes(question);
                const questionWasCorrect = isCorrect(question, selected);
                const correctAnswerText = correctIndexes
                    .map((correctIndex) => question.choices[correctIndex])
                    .join(', ');

                return (
                    <View key={`${question.prompt}-${index}`} style={styles.summaryCard}>
                        <Text style={styles.summaryPrompt}>{question.prompt}</Text>
                        <Text style={questionWasCorrect ? styles.correctLabel : styles.incorrectLabel}>
                            {questionWasCorrect ? 'Correct (+1)' : 'Incorrect (+0)'}
                        </Text>
                        <Text style={styles.correctAnswerLine}>Correct answer: {correctAnswerText}</Text>

                        {question.choices.map((choice, choiceIndex) => {
                            const isChosen = selectedArray.includes(choiceIndex);
                            const isChoiceCorrect = correctIndexes.includes(choiceIndex);

                            const choiceStyles = [styles.summaryChoice];

                            if (isChosen && isChoiceCorrect) {
                                choiceStyles.push(styles.boldCorrectChoice);
                            }

                            if (isChosen && !isChoiceCorrect) {
                                choiceStyles.push(styles.struckIncorrectChoice);
                            }

                            if (!isChosen && isChoiceCorrect) {
                                choiceStyles.push(styles.revealCorrectChoice);
                            }

                            const suffixParts = [];
                            if (isChoiceCorrect) {
                                suffixParts.push('Correct');
                            }
                            if (isChosen && isChoiceCorrect) {
                                suffixParts.push('Your choice');
                            }
                            if (isChosen && !isChoiceCorrect) {
                                suffixParts.push('Your incorrect choice');
                            }
                            const suffix = suffixParts.length ? ` (${suffixParts.join(', ')})` : '';

                            return (
                                <Text key={`${choice}-${choiceIndex}`} style={choiceStyles}>
                                    {choice}
                                    {suffix}
                                </Text>
                            );
                        })}
                    </View>
                );
            })}
        </ScrollView>
    );
}

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerBackVisible: false,
                    gestureEnabled: false,
                    headerStyle: { backgroundColor: '#f3f4f6' },
                    headerShadowVisible: false,
                    headerTitleStyle: { color: '#111827', fontWeight: '600' },
                    contentStyle: { backgroundColor: '#f3f4f6' },
                }}
            >
                <Stack.Screen
                    name="Question"
                    component={Question}
                    initialParams={{
                        data: SAMPLE_QUESTIONS,
                        currentIndex: 0,
                        answers: [],
                    }}
                    options={{ title: 'Quick Quiz' }}
                />
                <Stack.Screen
                    name="Summary"
                    component={Summary}
                    options={{ title: 'Results', gestureEnabled: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
    },
    content: {
        backgroundColor: '#f3f4f6',
        padding: 0,
    },
    progressText: {
        fontSize: 13,
        color: '#4b5563',
        marginBottom: 10,
    },
    prompt: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },
    choiceGroup: {
        borderRadius: 0,
        borderColor: '#9ca3af',
        borderWidth: 1,
        marginBottom: 18,
    },
    choiceButton: {
        backgroundColor: '#ffffff',
        paddingVertical: 12,
    },
    choiceSelectedButton: {
        backgroundColor: '#e5e7eb',
    },
    choiceText: {
        color: '#1f2937',
    },
    choiceSelectedText: {
        color: '#111827',
        fontWeight: '700',
    },
    summaryContainer: {
        padding: 16,
        backgroundColor: '#f3f4f6',
    },
    summaryTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 6,
    },
    totalText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 14,
    },
    summaryCard: {
        backgroundColor: '#ffffff',
        borderRadius: 0,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    summaryPrompt: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    correctLabel: {
        color: '#111827',
        marginBottom: 8,
        fontWeight: '600',
    },
    incorrectLabel: {
        color: '#111827',
        marginBottom: 8,
        fontWeight: '600',
    },
    correctAnswerLine: {
        color: '#111827',
        marginBottom: 8,
        fontWeight: '700',
    },
    summaryChoice: {
        fontSize: 15,
        color: '#1f2937',
        marginBottom: 4,
    },
    boldCorrectChoice: {
        fontWeight: '800',
        color: '#111827',
    },
    struckIncorrectChoice: {
        textDecorationLine: 'line-through',
        color: '#111827',
    },
    revealCorrectChoice: {
        color: '#111827',
    },
});
