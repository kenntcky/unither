import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  PermissionsAndroid,
  StatusBar,
  Dimensions,
  Modal,
  Animated,
} from "react-native"
import { launchImageLibrary, launchCamera } from "react-native-image-picker"
import { pick } from "@react-native-documents/picker"
import RNFetchBlob from "rn-fetch-blob"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import firestore from "@react-native-firebase/firestore"
import auth from "@react-native-firebase/auth"
import { useClass } from "../context/ClassContext"
import Colors from "../constants/Colors"
import { t } from "../translations"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { getApiKeys, testApiKeys } from '../utils/apiKeys'
import { GoogleGenAI } from "@google/genai"

// Get API keys with fallback mechanism
const { AIMLAPI_KEY_1, AIMLAPI_KEY_2, AIMLAPI_KEY_3, GEMINI_API_KEY } = getApiKeys();
const AIMLAPI_KEYS = [AIMLAPI_KEY_1, AIMLAPI_KEY_2, AIMLAPI_KEY_3];

const { width, height } = Dimensions.get("window")

// Custom Success Popup Component
const SuccessPopup = ({ visible, onClose, onViewMaterial, onCreateAnother, materialTitle }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Start animations when popup becomes visible
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations when popup is hidden
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      bounceAnim.setValue(0);
      confettiAnim.setValue(0);
    }
  }, [visible]);

  const bounceInterpolate = bounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });

  const confettiTranslateY = confettiAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, height],
  });

  const renderConfetti = () => {
    const confettiPieces = [];
    const colors = [Colors.primary, Colors.secondary, Colors.accent, Colors.success, '#FFD700', '#FF6B6B'];
    
    for (let i = 0; i < 20; i++) {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const randomLeft = Math.random() * width;
      const randomDelay = Math.random() * 1000;
      
      confettiPieces.push(
        <Animated.View
          key={i}
          style={[
            styles.confettiPiece,
            {
              backgroundColor: randomColor,
              left: randomLeft,
              transform: [
                {
                  translateY: confettiTranslateY,
                },
                {
                  rotate: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      );
    }
    return confettiPieces;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Confetti Animation */}
        <View style={styles.confettiContainer}>
          {renderConfetti()}
        </View>

        <Animated.View
          style={[
            styles.popup,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { scale: bounceInterpolate },
              ],
            },
          ]}
        >
          {/* Success Icon with Glow Effect */}
          <View style={styles.iconContainer}>
            <View style={styles.glowEffect} />
            <Animated.View
              style={[
                styles.successIcon,
                {
                  transform: [{ scale: bounceInterpolate }],
                },
              ]}
            >
              <Icon name="check-circle" size={80} color={Colors.success} />
            </Animated.View>
          </View>

          {/* Success Message */}
          <Text style={styles.successTitle}>🎉 Berhasil!</Text>
          <Text style={styles.successSubtitle}>
            Material "{materialTitle}" telah berhasil diproses!
          </Text>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Icon name="file-document" size={20} color={Colors.primary} />
              <Text style={styles.featureText}>Ringkasan detail telah dibuat</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="help-circle" size={20} color={Colors.primary} />
              <Text style={styles.featureText}>Soal kuis telah digenerate</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="brain" size={20} color={Colors.primary} />
              <Text style={styles.featureText}>Materi pembelajaran siap digunakan</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onViewMaterial}
              activeOpacity={0.8}
            >
              <Icon name="eye" size={20} color={Colors.textLight} />
              <Text style={styles.primaryButtonText}>Lihat Material</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onCreateAnother}
              activeOpacity={0.8}
            >
              <Icon name="plus" size={20} color={Colors.primary} />
              <Text style={styles.secondaryButtonText}>Buat Lagi</Text>
            </TouchableOpacity>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Icon name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const AddAiMaterial = ({ navigation, route }) => {
  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState("")
  const [file, setFile] = useState(null)
  const [fileType, setFileType] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploadType, setUploadType] = useState("")
  const [activeClassId, setActiveClassId] = useState(null)
  const { classId, currentClass } = useClass()
  const currentUser = auth().currentUser
  const [currentStep, setCurrentStep] = useState(1)
  // Add state for success popup
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)

  // Test API keys on component mount
  useEffect(() => {
    const apiKeyResult = testApiKeys();
    console.log('API keys test results:', apiKeyResult);
    console.log('API keys summary:', apiKeyResult.keySummary);
    
    if (!apiKeyResult.allLoaded) {
      console.warn('Some API keys are not available!');
      Alert.alert(
        'API Key Warning',
        'Some API keys are missing. This may affect AI material processing.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  // Request necessary permissions on Android
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === "android") {
        try {
          const permissions = [
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          ]

          const results = await PermissionsAndroid.requestMultiple(permissions)

          const allGranted = Object.values(results).every((result) => result === PermissionsAndroid.RESULTS.GRANTED)

          if (!allGranted) {
            console.warn("Some permissions were not granted")
          }
        } catch (err) {
          console.warn("Error requesting permissions:", err)
        }
      }
    }

    requestPermissions()
  }, [])

  // Try to get classId from multiple sources
  useEffect(() => {
    const getActiveClassId = async () => {
      // First try from context directly
      if (classId) {
        console.log("Using classId from context:", classId)
        setActiveClassId(classId)
        return
      }

      // Then try from currentClass object
      if (currentClass && currentClass.id) {
        console.log("Using classId from currentClass object:", currentClass.id)
        setActiveClassId(currentClass.id)
        return
      }

      // Finally try from AsyncStorage
      try {
        const savedClassId = await AsyncStorage.getItem("taskmaster_active_class_id")
        if (savedClassId) {
          console.log("Using classId from AsyncStorage:", savedClassId)
          setActiveClassId(savedClassId)
          return
        }
      } catch (error) {
        console.error("Error reading classId from AsyncStorage:", error)
      }

      console.warn("Could not determine active class ID from any source")
    }

    getActiveClassId()
  }, [classId, currentClass])

  // Take photo with camera
  const takePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: "photo",
        includeBase64: true,
        maxHeight: 1200,
        maxWidth: 1200,
      })

      if (result.didCancel) return

      if (result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0]
        setFile({
          name: "camera_photo.jpg",
          uri: selectedAsset.uri,
          type: "image/jpeg",
          content: selectedAsset.base64,
        })
        setFileType("image/jpeg")
        setUploadType("image")
        setCurrentStep(2)
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo")
      console.error(error)
    }
  }

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        includeBase64: true,
        maxHeight: 1200,
        maxWidth: 1200,
      })

      if (result.didCancel) return

      if (result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0]
        const fileName = selectedAsset.fileName || "image.jpg"

        setFile({
          name: fileName,
          uri: selectedAsset.uri,
          type: selectedAsset.type || "image/jpeg",
          content: selectedAsset.base64,
        })
        setFileType(selectedAsset.type || "image/jpeg")
        setUploadType("image")
        setCurrentStep(2)

        if (!title && fileName) {
          // Use filename as default title (without extension)
          const titleFromName = fileName.split(".").slice(0, -1).join(".")
          setTitle(titleFromName)
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image")
      console.error(error)
    }
  }

  // Pick a document
  const pickDocument = async () => {
    try {
      const results = await pick({
        allowMultiSelection: false,
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ],
      })

      if (!results || results.length === 0) return

      const selectedDoc = results[0]
      console.log("Selected document:", selectedDoc)

      // Get the file URI properly
      const fileUri = selectedDoc.uri

      // Determine if we need to read the file from a content URI
      let filePath = fileUri
      if (fileUri.startsWith("content://")) {
        try {
          // For content:// URIs, we may need to use the fileCopyUri if available
          // or get a readable path another way
          console.log("Document is a content URI, attempting to get readable path")

          if (selectedDoc.fileCopyUri) {
            filePath = selectedDoc.fileCopyUri
          } else {
            // For some Android content URIs, we might need RNFetchBlob's fs.stat
            const fileInfo = await RNFetchBlob.fs.stat(fileUri)
            filePath = fileInfo.path
          }
        } catch (pathError) {
          console.warn("Could not get file path from content URI, using original URI", pathError)
          // Continue with original URI as fallback
        }
      }

      console.log("Reading file from path:", filePath)

      // Read the file content as base64
      const fileContent = await RNFetchBlob.fs.readFile(filePath, "base64")

      setFile({
        name: selectedDoc.name,
        uri: fileUri,
        type: selectedDoc.type || selectedDoc.mimeType,
        content: fileContent,
      })
      setFileType(selectedDoc.type || selectedDoc.mimeType)
      setUploadType("document")
      setCurrentStep(2)

      if (!title && selectedDoc.name) {
        // Use filename as default title (without extension)
        const titleFromName = selectedDoc.name.split(".").slice(0, -1).join(".")
        setTitle(titleFromName)
      }
    } catch (error) {
      // Check for cancellation
      if (error.code === "OPERATION_CANCELED") {
        console.log("Document selection cancelled")
        return
      }

      Alert.alert("Error", "Failed to pick document: " + (error.message || error))
      console.error("Document picker error:", error)
    }
  }

  // Process with AIMLAPI
  const processWithAIMLAPI = async (apiKey, base64Content, contentType, userMessage, systemMessage) => {
    console.log(`Trying AIMLAPI with key ending in ...${apiKey.slice(-4)}`)

    const response = await fetch("https://api.aimlapi.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-preview",
        messages: [
          { role: "system", content: systemMessage },
          {
            role: "user",
            content: [
              { type: "text", text: userMessage },
              // Make sure we have a valid image URL format
              {
                type: "image_url",
                image_url: {
                  url: `data:${contentType};base64,${base64Content}`,
                },
              },
            ],
          },
        ],
        temperature: 0.5, // Lower temperature for more predictable JSON
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    })

    console.log("API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API error response:", errorText)
      throw new Error(`API request failed with status ${response.status}: ${errorText}`)
    }

    return await response.json()
  }

  // Process with Gemini API
  const processWithGeminiAPI = async (base64Content, contentType, userMessage, systemMessage) => {
    console.log("Falling back to Gemini API using direct HTTP request");

    // GEMINI_API_KEY is already loaded through getApiKeys() at the top of the file
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not available');
      throw new Error('Gemini API key is not configured');
    }
    
    console.log('Using GEMINI_API_KEY');
    
    try {
      // Check if the MIME type is supported by Gemini
      // Gemini supports primarily image formats and text
      const supportedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "text/plain",
        "application/pdf",
        "application/json",
      ];

      const isSupported = supportedMimeTypes.includes(contentType);
      console.log(`MIME type ${contentType} supported by Gemini: ${isSupported}`);

      // Prepare the prompt text
      let promptText = `${systemMessage}

${userMessage}`;
      
      if (!isSupported) {
        // For unsupported types, just add a note to the prompt
        promptText += `

Note: A file of type ${contentType} was uploaded but cannot be processed directly by the AI.`;
        console.log("Skipping file attachment for unsupported MIME type");

        // Show user-friendly alert about unsupported file type
        Alert.alert(
          "Unsupported File Type",
          `The file type ${contentType} (like .docx) is not supported by the AI. 

For best results, please use PDF, JPG, PNG, or text files.`,
          [{ text: "OK", onPress: () => console.log("User acknowledged unsupported file format") }]
        );
      }

      // Build a prompt that explicitly requests the expected JSON format
      // Include the format instructions from the original userMessage
      const formattedPrompt = `${promptText}

IMPORTANT: You MUST format your response exactly as a valid JSON object with the following structure:
{
  "summary": "Detailed summary of the material using Markdown formatting...",
  "quiz": [
    {
      "question": "Question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0
    }
  ]
}

Make sure the JSON is correctly formatted with no syntax errors. Use markdown in the summary field.`;
      
      // Create a request payload with the formatted prompt
      const payload = {
        contents: [
          {
            parts: [
              { text: formattedPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4000,
          topP: 0.8,
          topK: 40
        }
      };

      // If the file type is supported, we could add the file attachment later
      // For now, let's make sure the basic text processing works

      // URL for Gemini API
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${GEMINI_API_KEY}`;
      
      console.log("Sending direct HTTP request to Gemini API");
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Gemini API response received");
      
      // Extract the text from the response
      let responseText = '';
      if (data.candidates && data.candidates.length > 0 && 
          data.candidates[0].content && data.candidates[0].content.parts) {
        responseText = data.candidates[0].content.parts
          .filter(part => part.text)
          .map(part => part.text)
          .join('\n');
      }
      
      console.log('Raw response:', responseText);
      
      // Clean up the response to extract just the JSON part
      // Sometimes AI models add extra text before or after the JSON
      let jsonStartIndex = responseText.indexOf('{');
      let jsonEndIndex = responseText.lastIndexOf('}') + 1;
      
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        // Extract what looks like JSON
        responseText = responseText.substring(jsonStartIndex, jsonEndIndex);
      }
      
      // Try to parse as JSON first
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
        console.log("Successfully parsed Gemini API response as JSON");
        
        // Validate the response has the expected format
        if (!parsedResponse.summary || !parsedResponse.quiz || !Array.isArray(parsedResponse.quiz)) {
          console.warn("Response JSON doesn't have the expected format, fixing structure");
          // Fix missing fields if needed
          parsedResponse = {
            summary: parsedResponse.summary || "The AI couldn't generate a proper summary.",
            quiz: Array.isArray(parsedResponse.quiz) ? parsedResponse.quiz : []
          };
          
          // Ensure we have at least one quiz question if none were generated
          if (parsedResponse.quiz.length === 0) {
            parsedResponse.quiz.push({
              question: "What is the main topic of this content?",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: 0
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse response as JSON:", e);
        console.log("Response text:", responseText);
        
        // If it's not valid JSON, create a basic structured response
        parsedResponse = {
          summary: `The AI generated content in an unexpected format. Here's the raw response:

${responseText}`,
          quiz: [
            {
              question: "What is the main topic of this content?",
              options: ["Topic A", "Topic B", "Topic C", "Topic D"],
              correctAnswer: 0
            }
          ]
        };
      }

      // Return in the format expected by the app
      return {
        choices: [
          {
            message: {
              // Instead of stringifying, which would escape quotes, we return the object directly
              // This ensures the content is properly parsed by the app later
              content: JSON.stringify(parsedResponse),
            },
          },
        ],
      };
    } catch (error) {
      // Handle any errors in the Gemini API processing
      console.error("Error in Gemini API processing:", error);
      throw error;
    }
  }

  // Attempt processing with all available APIs
  const attemptProcessing = async (base64Content, contentType, userMessage, systemMessage) => {
    // Try each AIMLAPI key
    for (const apiKey of AIMLAPI_KEYS) {
      try {
        return await processWithAIMLAPI(apiKey, base64Content, contentType, userMessage, systemMessage)
      } catch (error) {
      }
    }

    // If all AIMLAPI keys fail, try Gemini API
    try {
      return await processWithGeminiAPI(base64Content, contentType, userMessage, systemMessage)
    } catch (error) {
      console.error("Gemini API failed:", error)
      throw new Error("All API attempts failed. Please try again later.")
    }
  }

  // Process the uploaded content with AI
  const processWithAI = async () => {
    if (!file) {
      Alert.alert("Error", "Please upload a file first")
      return
    }

    if (!title) {
      Alert.alert("Error", "Please provide a title for this material")
      return
    }

    // Use the activeClassId instead of classId from context
    if (!activeClassId) {
      Alert.alert("Error", "No class selected. Please join or select a class first.")
      console.error(
        "No active class ID found. Context classId:",
        classId,
        "Current class:",
        currentClass?.id,
        "Active classId state:",
        activeClassId,
      )
      return
    }

    setLoading(true)

    try {
      console.log("Starting AI processing for class:", activeClassId)

      // Validate file data
      if (!file.content) {
        console.error("File content is missing or empty")
        throw new Error("Image data is missing or corrupted. Please try uploading again.")
      }

      const base64Content = file.content
      const contentType = file.type || "image/jpeg"
      console.log("Image data length:", base64Content.length, "Content type:", contentType)

      // Prepare user message based on file type
      let userMessage = ""
      if (uploadType === "image") {
        userMessage = `Here is an image that contains text or information to understand. ${prompt ? "Additional context: " + prompt : ""}`
      } else {
        userMessage = `Here is a document that contains text or information to understand. ${prompt ? "Additional context: " + prompt : ""}`
      }

      // System message to guide the AI
      const systemMessage = `You are an educational AI assistant. Your task is to:
1. Analyze the uploaded content thoroughly
2. Create a detailed summary of the key points and concepts
3. Generate a quiz with questions that test understanding of the material
4. For each question, provide 4 multiple-choice options with exactly one correct answer
5. Mark the correct answer for each question

IMPORTANT: You MUST format your response as clean, parseable JSON without backticks or code blocks around the JSON itself.

Format your response as follows:
{
  "summary": "Detailed summary of the material using Markdown formatting...",
  "quiz": [
    {
      "question": "Question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0
    }
  ]
}

You SHOULD use markdown formatting in the summary for better readability:
- Use **bold** for important terms or concepts
- Use *italics* for emphasis
- Use # for headings (# Main Heading, ## Section, etc.)
- Use bullet points and numbered lists where appropriate
- Use code formatting for code snippets or mathematical formulas
- Use > for quotes or important information
- Use tables if needed for structured data

The number of questions should be proportional to the complexity and length of the material, with a minimal of 5 questions. Make sure you respond with the language that the user is using.`

      // Try processing with available APIs
      const responseData = await attemptProcessing(base64Content, contentType, userMessage, systemMessage)

      console.log("API response received:", JSON.stringify(responseData).substring(0, 200) + "...")

      // Check if responseData has the expected structure
      if (!responseData || !responseData.choices || !responseData.choices.length) {
        console.error("Unexpected API response format:", responseData)
        throw new Error("API returned an unexpected response format")
      }

      // Extract and parse the response
      const aiResponse = responseData.choices[0]?.message?.content

      if (!aiResponse) {
        console.error("No content in AI response:", responseData)
        throw new Error("API response is missing content")
      }

      console.log("AI response content:", aiResponse?.substring(0, 100)) // Log the first 100 chars

      // Robust JSON parsing with better error handling
      let parsedResponse
      try {
        // Some models might return markdown-formatted JSON with backticks
        // Remove any markdown code block indicators if present
        const cleanedResponse = aiResponse.replace(/^```json\s*|```\s*$/g, "")
        parsedResponse = JSON.parse(cleanedResponse)
        console.log("JSON parsed successfully")
      } catch (parseError) {
        console.error("JSON parse error:", parseError)
        console.error("Response content causing parse error:", aiResponse)
        throw new Error("Failed to parse AI response as JSON. Try again or use a different model.")
      }

      // Validate the parsed response has expected properties
      if (!parsedResponse.summary || !parsedResponse.quiz || !Array.isArray(parsedResponse.quiz)) {
        console.error("Invalid response format:", parsedResponse)
        throw new Error("AI response is missing required fields (summary or quiz)")
      }

      // Sanitize quiz data to ensure no undefined values (Firestore doesn't accept undefined)
      const sanitizedQuiz = parsedResponse.quiz.map((question) => {
        // Ensure all required question fields exist
        const sanitizedQuestion = {
          question: question.question || "Question missing",
          options: Array.isArray(question.options)
            ? // Make sure no undefined values in options array
              question.options.map((opt) => opt || "Option missing")
            : ["Option missing", "Option missing", "Option missing", "Option missing"],
          correctAnswer: typeof question.correctAnswer === "number" ? question.correctAnswer : 0,
        }

        // Ensure correctAnswer is within valid range (0-3)
        if (
          sanitizedQuestion.correctAnswer < 0 ||
          sanitizedQuestion.correctAnswer >= sanitizedQuestion.options.length
        ) {
          sanitizedQuestion.correctAnswer = 0
        }

        return sanitizedQuestion
      })

      // Create a material record in Firestore
      const materialData = {
        title,
        prompt: prompt || "",
        fileType: fileType || "unknown",
        fileName: file.name || "unnamed",
        uploadType: uploadType || "image",
        summary: parsedResponse.summary || "No summary available",
        quizQuestions: sanitizedQuiz,
        createdAt: firestore.FieldValue.serverTimestamp(),
        createdBy: {
          uid: currentUser?.uid || "anonymous",
          displayName: currentUser?.displayName || "",
          email: currentUser?.email || "",
        },
        classId: activeClassId, // Use the resolved classId
        scoreBoard: [],
      }

      console.log("Prepared Firestore document:", JSON.stringify(materialData))

      // Validate entire document to ensure no undefined values
      const validateFirestoreDoc = (obj) => {
        for (const key in obj) {
          if (obj[key] === undefined) {
            console.error(`Found undefined value in document at key: ${key}`)
            obj[key] = null // Replace undefined with null
          }

          // Special handling for arrays
          if (Array.isArray(obj[key])) {
            // Check for undefined elements or empty arrays
            if (obj[key].length === 0) {
              console.warn(`Empty array found at key: ${key}, adding default item`)
              // Add default item depending on context
              if (key === "quizQuestions") {
                obj[key] = [
                  {
                    question: "Default question",
                    options: ["Option A", "Option B", "Option C", "Option D"],
                    correctAnswer: 0,
                  },
                ]
              } else {
                obj[key] = ["Default item"] // Generic default
              }
            }

            // Check array items
            for (let i = 0; i < obj[key].length; i++) {
              if (obj[key][i] === undefined) {
                console.error(`Found undefined value in array at ${key}[${i}]`)
                obj[key][i] = null
              } else if (typeof obj[key][i] === "object" && obj[key][i] !== null) {
                validateFirestoreDoc(obj[key][i]) // Recursively check objects in array
              }
            }

            // Remove _elements property if exists (causes Firestore errors)
            if (obj[key]._elements !== undefined) {
              console.warn(`Found _elements property in array at key: ${key}, removing it`)
              delete obj[key]._elements
            }
          }
          // Check nested objects
          else if (typeof obj[key] === "object" && obj[key] !== null) {
            // Check for special Firebase timestamp objects and don't validate them
            if (obj[key]._type === "timestamp") {
              continue // Skip validating Firebase timestamp objects
            }

            validateFirestoreDoc(obj[key]) // Recursively check nested objects
          }
        }
      }

      // Run validation to catch any undefined values
      validateFirestoreDoc(materialData)

      // Save to Firestore
      try {
        console.log("Saving AI material to class:", activeClassId)
        // Store AI material as a subcollection of the class
        await firestore().collection("classes").doc(activeClassId).collection("aiMaterials").add(materialData)

        // Show custom success popup instead of Alert
        setShowSuccessPopup(true)
        
      } catch (firestoreError) {
        console.error("Firestore save error:", firestoreError)
        Alert.alert("Error", "Failed to save the processed material to the database. Please try again.")
      }
    } catch (error) {
      console.error("Error processing with AI:", error)
      Alert.alert("Error", "Failed to process with AI: " + (error.message || "Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  const renderFilePreview = () => {
    if (!file) return null

    if (uploadType === "image") {
      return (
        <View style={styles.filePreviewContainer}>
          <View style={styles.filePreview}>
            <Image source={{ uri: file.uri }} style={styles.imagePreview} resizeMode="contain" />
          </View>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
        </View>
      )
    }

    // Select appropriate icon based on document type
    let iconName = "file-document"
    let iconColor = Colors.primary

    if (fileType?.includes("pdf")) {
      iconName = "file-pdf-box"
      iconColor = Colors.error
    } else if (fileType?.includes("word") || fileType?.includes("doc")) {
      iconName = "file-word-box"
      iconColor = Colors.primary
    } else if (fileType?.includes("text") || fileType?.includes("txt")) {
      iconName = "file-text"
      iconColor = Colors.textSecondary
    }

    // Calculate file size if content exists
    const fileSize = file.content ? Math.round((file.content.length * 3) / 4 / 1024) : "?"

    return (
      <View style={styles.filePreviewContainer}>
        <View style={styles.filePreview}>
          <Icon name={iconName} size={70} color={iconColor} />
        </View>
        <Text style={styles.fileName} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={styles.fileSize}>{fileSize} KB</Text>
      </View>
    )
  }

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicator}>
        <View style={styles.stepLine}>
          <View
            style={[styles.stepLineInner, { width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%" }]}
          />
        </View>
        <View style={styles.stepsContainer}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, currentStep >= 1 && styles.activeStepCircle]}>
              <Text style={[styles.stepNumber, currentStep >= 1 && styles.activeStepNumber]}>1</Text>
            </View>
            <Text style={[styles.stepText, currentStep >= 1 && styles.activeStepText]}>Upload</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, currentStep >= 2 && styles.activeStepCircle]}>
              <Text style={[styles.stepNumber, currentStep >= 2 && styles.activeStepNumber]}>2</Text>
            </View>
            <Text style={[styles.stepText, currentStep >= 2 && styles.activeStepText]}>Details</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, currentStep >= 3 && styles.activeStepCircle]}>
              <Text style={[styles.stepNumber, currentStep >= 3 && styles.activeStepNumber]}>3</Text>
            </View>
            <Text style={[styles.stepText, currentStep >= 3 && styles.activeStepText]}>Process</Text>
          </View>
        </View>
      </View>
    )
  }

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (currentStep > 1) {
              setCurrentStep(currentStep - 1)
            } else {
              navigation.goBack()
            }
          }}
        >
          <Icon name="arrow-left" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("Create AI Material")}</Text>
        <View style={styles.headerRight} />
      </View>
    )
  }

  const renderUploadStep = () => {
    return (
      <View style={styles.stepContent}>
        <View style={styles.uploadIntroContainer}>
          <Icon name="robot" size={60} color={Colors.primary} style={styles.uploadIcon} />
          <Text style={styles.uploadTitle}>{t("Upload Learning Material")}</Text>
          <Text style={styles.uploadSubtitle}>
            {t("Upload an image or document to generate AI-powered educational content")}
          </Text>
        </View>

        <View style={styles.uploadOptionsContainer}>
          <TouchableOpacity style={styles.uploadOptionCard} onPress={takePhoto}>
            <View style={styles.uploadOptionIconContainer}>
              <Icon name="camera" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.uploadOptionTitle}>{t("Camera")}</Text>
            <Text style={styles.uploadOptionDescription}>{t("Take a photo of notes, textbook, or whiteboard")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.uploadOptionCard} onPress={pickImage}>
            <View style={styles.uploadOptionIconContainer}>
              <Icon name="image-multiple" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.uploadOptionTitle}>{t("Gallery")}</Text>
            <Text style={styles.uploadOptionDescription}>{t("Select an image from your device")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.uploadOptionCard} onPress={pickDocument}>
            <View style={styles.uploadOptionIconContainer}>
              <Icon name="file-document" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.uploadOptionTitle}>{t("Document")}</Text>
            <Text style={styles.uploadOptionDescription}>{t("Upload PDF, Word, or text files")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Icon name="information-outline" size={20} color={Colors.secondary} />
          <Text style={styles.infoText}>
            {t("For best results, ensure text is clearly visible and images are well-lit")}
          </Text>
        </View>
      </View>
    )
  }

  const renderDetailsStep = () => {
    return (
      <View style={styles.stepContent}>
        <View style={styles.detailsContainer}>
          {renderFilePreview()}

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t("Material Title")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("Enter a descriptive title")}
              placeholderTextColor={Colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t("Additional Context (Optional)")}</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder={t("Add any specific instructions or context for the AI")}
              placeholderTextColor={Colors.textSecondary}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.infoCard}>
            <Icon name="lightbulb-outline" size={20} color={Colors.warning} />
            <Text style={styles.infoText}>
              {t("Adding context helps the AI understand the material better and generate more relevant content")}
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentStep(1)}>
            <Text style={styles.secondaryButtonText}>{t("Back")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, !title.trim() && styles.disabledButton]}
            onPress={() => {
              if (title.trim()) {
                setCurrentStep(3)
              } else {
                Alert.alert("Error", t("Please provide a title for this material"))
              }
            }}
            disabled={!title.trim()}
          >
            <Text style={styles.primaryButtonText}>{t("Continue")}</Text>
            <Icon name="arrow-right" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderProcessStep = () => {
    return (
      <View style={styles.stepContent}>
        <View style={styles.processContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{t("Review & Process")}</Text>

            <View style={styles.summaryRow}>
              <Icon name="format-title" size={20} color={Colors.primary} />
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryLabel}>{t("Title")}</Text>
                <Text style={styles.summaryValue}>{title}</Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <Icon name="file-document-outline" size={20} color={Colors.primary} />
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryLabel}>{t("File")}</Text>
                <Text style={styles.summaryValue}>{file?.name || "Unknown file"}</Text>
              </View>
            </View>

            {prompt ? (
              <View style={styles.summaryRow}>
                <Icon name="text" size={20} color={Colors.primary} />
                <View style={styles.summaryTextContainer}>
                  <Text style={styles.summaryLabel}>{t("Context")}</Text>
                  <Text style={styles.summaryValue} numberOfLines={2}>
                    {prompt}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.summaryRow}>
              <Icon name="school" size={20} color={Colors.primary} />
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryLabel}>{t("Class")}</Text>
                <Text style={styles.summaryValue}>{currentClass?.name || "Unknown class"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.aiInfoCard}>
            <View style={styles.aiInfoHeader}>
              <Icon name="robot" size={24} color={Colors.secondary} />
              <Text style={styles.aiInfoTitle}>{t("AI Processing")}</Text>
            </View>

            <Text style={styles.aiInfoText}>{t("The AI will analyze your material and generate:")}</Text>

            <View style={styles.aiFeatureRow}>
              <Icon name="check-circle" size={16} color={Colors.success} />
              <Text style={styles.aiFeatureText}>{t("A detailed summary of key concepts")}</Text>
            </View>

            <View style={styles.aiFeatureRow}>
              <Icon name="check-circle" size={16} color={Colors.success} />
              <Text style={styles.aiFeatureText}>{t("Multiple-choice quiz questions")}</Text>
            </View>

            <View style={styles.aiFeatureRow}>
              <Icon name="check-circle" size={16} color={Colors.success} />
              <Text style={styles.aiFeatureText}>{t("Organized learning material")}</Text>
            </View>

            <View style={styles.warningContainer}>
              <Icon name="alert-circle" size={16} color={Colors.warning} />
              <Text style={styles.warningText}>
                {t("Processing may take up to a minute depending on the content size")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentStep(2)}>
            <Text style={styles.secondaryButtonText}>{t("Back")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.processButton, loading && styles.disabledButton]}
            onPress={processWithAI}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={Colors.textLight} size="small" />
                <Text style={styles.loadingText}>{t("Processing...")}</Text>
              </View>
            ) : (
              <>
                <Icon name="brain" size={20} color={Colors.textLight} />
                <Text style={styles.processButtonText}>{t("Process with AI")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderUploadStep()
      case 2:
        return renderDetailsStep()
      case 3:
        return renderProcessStep()
      default:
        return renderUploadStep()
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      {renderHeader()}
      {renderStepIndicator()}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        {renderCurrentStep()}
      </ScrollView>
      
      {/* Success Popup */}
      <SuccessPopup
        visible={showSuccessPopup}
        materialTitle={title}
        onClose={() => setShowSuccessPopup(false)}
        onViewMaterial={() => {
          setShowSuccessPopup(false);
          navigation.goBack();
        }}
        onCreateAnother={() => {
          setShowSuccessPopup(false);
          setCurrentStep(1);
          setFile(null);
          setTitle("");
          setPrompt("");
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: 100,
    paddingTop: 40,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.textLight,
  },
  headerRight: {
    width: 40,
  },
  stepIndicator: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: Colors.surface,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  stepLine: {
    position: "absolute",
    top: 40,
    left: 60,
    right: 60,
    height: 2,
    backgroundColor: Colors.separator,
    zIndex: 1,
  },
  stepLineInner: {
    height: 2,
    backgroundColor: Colors.primary,
  },
  stepsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 2,
  },
  stepItem: {
    alignItems: "center",
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.separator,
    justifyContent: "center",
    alignItems: "center",
  },
  activeStepCircle: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.textSecondary,
  },
  activeStepNumber: {
    color: Colors.textLight,
  },
  stepText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  activeStepText: {
    color: Colors.primary,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  uploadIntroContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  uploadIcon: {
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  uploadOptionsContainer: {
    marginVertical: 30,
  },
  uploadOptionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  uploadOptionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  uploadOptionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  uploadOptionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    marginLeft: 10,
    textAlign: "right",
  },
  infoCard: {
    backgroundColor: `${Colors.primary}10`,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 8,
    flex: 1,
  },
  detailsContainer: {
    marginVertical: 16,
  },
  filePreviewContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  filePreview: {
    width: width * 0.7,
    height: width * 0.5,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    elevation: 3,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  fileName: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
    marginTop: 12,
  },
  fileSize: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    color: Colors.text,
    padding: 12,
    fontSize: 16,
  },
  multilineInput: {
    height: 120,
    textAlignVertical: "top",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 100,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  primaryButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  processContainer: {
    marginVertical: 16,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 16,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  summaryTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    color: Colors.text,
  },
  aiInfoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  aiInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  aiInfoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary,
    marginLeft: 8,
  },
  aiInfoText: {
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 12,
  },
  aiFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  aiFeatureText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 8,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.warning}10`,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  warningText: {
    fontSize: 12,
    color: Colors.warning,
    marginLeft: 8,
    flex: 1,
  },
  processButton: {
    flex: 2,
    backgroundColor: Colors.accent,
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  processButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  
  // Custom Success Popup Styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  confettiPiece: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  popup: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  iconContainer: {
    marginVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowEffect: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.success + '20',
    transform: [{ scale: 1.5 }],
  },
  successIcon: {
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    padding: 8,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: Colors.backgroundLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.backgroundLight,
  },
})

export default AddAiMaterial