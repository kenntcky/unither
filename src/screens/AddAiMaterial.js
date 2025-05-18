import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { pick } from '@react-native-documents/picker';
import RNFetchBlob from 'rn-fetch-blob';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useClass } from '../context/ClassContext';
import Colors from '../constants/Colors';
import { t } from '../translations';
import ScreenHeader from '../components/ScreenHeader';
import { GoogleGenAI } from '@google/genai';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIMLAPI_KEY_1, AIMLAPI_KEY_2, AIMLAPI_KEY_3, GEMINI_API_KEY } from '@env';

const AIMLAPI_KEYS = [
  AIMLAPI_KEY_1,
  AIMLAPI_KEY_2,
  AIMLAPI_KEY_3
];

const AddAiMaterial = ({ navigation, route }) => {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadType, setUploadType] = useState('');
  const [activeClassId, setActiveClassId] = useState(null);
  const { classId, currentClass } = useClass();
  const currentUser = auth().currentUser;

  // Request necessary permissions on Android
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          const permissions = [
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
          ];
          
          const results = await PermissionsAndroid.requestMultiple(permissions);
          
          const allGranted = Object.values(results).every(
            result => result === PermissionsAndroid.RESULTS.GRANTED
          );
          
          if (!allGranted) {
            console.warn('Some permissions were not granted');
          }
        } catch (err) {
          console.warn('Error requesting permissions:', err);
        }
      }
    };
    
    requestPermissions();
  }, []);

  // Try to get classId from multiple sources
  useEffect(() => {
    const getActiveClassId = async () => {
      // First try from context directly
      if (classId) {
        console.log('Using classId from context:', classId);
        setActiveClassId(classId);
        return;
      }
      
      // Then try from currentClass object
      if (currentClass && currentClass.id) {
        console.log('Using classId from currentClass object:', currentClass.id);
        setActiveClassId(currentClass.id);
        return;
      }
      
      // Finally try from AsyncStorage
      try {
        const savedClassId = await AsyncStorage.getItem('taskmaster_active_class_id');
        if (savedClassId) {
          console.log('Using classId from AsyncStorage:', savedClassId);
          setActiveClassId(savedClassId);
          return;
        }
      } catch (error) {
        console.error('Error reading classId from AsyncStorage:', error);
      }
      
      console.warn('Could not determine active class ID from any source');
    };
    
    getActiveClassId();
  }, [classId, currentClass]);

  console.log('AddAiMaterial - Context classId:', classId);
  console.log('AddAiMaterial - Current class:', currentClass?.id, currentClass?.name);
  console.log('AddAiMaterial - Using active classId:', activeClassId);

  // Take photo with camera
  const takePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        includeBase64: true,
        maxHeight: 1200,
        maxWidth: 1200,
      });

      if (result.didCancel) return;

      if (result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setFile({
          name: 'camera_photo.jpg',
          uri: selectedAsset.uri,
          type: 'image/jpeg',
          content: selectedAsset.base64,
        });
        setFileType('image/jpeg');
        setUploadType('image');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      console.error(error);
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        maxHeight: 1200,
        maxWidth: 1200,
      });

      if (result.didCancel) return;

      if (result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        const fileName = selectedAsset.fileName || 'image.jpg';
        
        setFile({
          name: fileName,
          uri: selectedAsset.uri,
          type: selectedAsset.type || 'image/jpeg',
          content: selectedAsset.base64,
        });
        setFileType(selectedAsset.type || 'image/jpeg');
        setUploadType('image');
        
        if (!title && fileName) {
          // Use filename as default title (without extension)
          const titleFromName = fileName.split('.').slice(0, -1).join('.');
          setTitle(titleFromName);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error(error);
    }
  };

  // Pick a document
  const pickDocument = async () => {
    try {
      const results = await pick({
        allowMultiSelection: false,
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ],
      });
      
      if (!results || results.length === 0) return;
      
      const selectedDoc = results[0];
      console.log('Selected document:', selectedDoc);
      
      // Get the file URI properly
      const fileUri = selectedDoc.uri;
      
      // Determine if we need to read the file from a content URI
      let filePath = fileUri;
      if (fileUri.startsWith('content://')) {
        try {
          // For content:// URIs, we may need to use the fileCopyUri if available
          // or get a readable path another way
          console.log('Document is a content URI, attempting to get readable path');
          
          if (selectedDoc.fileCopyUri) {
            filePath = selectedDoc.fileCopyUri;
          } else {
            // For some Android content URIs, we might need RNFetchBlob's fs.stat
            const fileInfo = await RNFetchBlob.fs.stat(fileUri);
            filePath = fileInfo.path;
          }
        } catch (pathError) {
          console.warn('Could not get file path from content URI, using original URI', pathError);
          // Continue with original URI as fallback
        }
      }
      
      console.log('Reading file from path:', filePath);
      
      // Read the file content as base64
      const fileContent = await RNFetchBlob.fs.readFile(filePath, 'base64');
      
      setFile({
        name: selectedDoc.name,
        uri: fileUri,
        type: selectedDoc.type || selectedDoc.mimeType,
        content: fileContent,
      });
      setFileType(selectedDoc.type || selectedDoc.mimeType);
      setUploadType('document');
      
      if (!title && selectedDoc.name) {
        // Use filename as default title (without extension)
        const titleFromName = selectedDoc.name.split('.').slice(0, -1).join('.');
        setTitle(titleFromName);
      }
    } catch (error) {
      // Check for cancellation
      if (error.code === 'OPERATION_CANCELED') {
        console.log('Document selection cancelled');
        return;
      }
      
      Alert.alert('Error', 'Failed to pick document: ' + (error.message || error));
      console.error('Document picker error:', error);
    }
  };

  // Process with AIMLAPI
  const processWithAIMLAPI = async (apiKey, base64Content, contentType, userMessage, systemMessage) => {
    console.log(`Trying AIMLAPI with key ending in ...${apiKey.slice(-4)}`);
    
    const response = await fetch('https://api.aimlapi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview',
        messages: [
          { role: 'system', content: systemMessage },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userMessage },
              // Make sure we have a valid image URL format
              { 
                type: 'image_url', 
                image_url: {
                  url: `data:${contentType};base64,${base64Content}`
                }
              }
            ]
          }
        ],
        temperature: 0.5, // Lower temperature for more predictable JSON
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })
    });

    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    return await response.json();
  };

  // Process with Gemini API
  const processWithGeminiAPI = async (base64Content, contentType, userMessage, systemMessage) => {
    console.log('Falling back to Gemini API');
    
    // Initialize the Gemini AI
    const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    // Check if the MIME type is supported by Gemini
    // Gemini supports primarily image formats and text
    const supportedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'text/plain', 'application/pdf', 'application/json'
    ];
    
    const isSupported = supportedMimeTypes.includes(contentType);
    console.log(`MIME type ${contentType} supported by Gemini: ${isSupported}`);
    
    // Handle unsupported mime types
    let actualContentType = contentType;
    let parts = [
      { text: `${systemMessage}\n\n${userMessage}` }
    ];
    
    // Only add the file data if the MIME type is supported
    if (isSupported) {
      parts.push({
        inlineData: {
          mimeType: actualContentType,
          data: base64Content,
        },
      });
    } else {
      // For unsupported types, just use text with a note about the file
      parts[0].text += `\n\nNote: A file of type ${contentType} was uploaded but cannot be processed directly by the AI.`;
      console.log('Skipping file attachment for unsupported MIME type');
      
      // Show user-friendly alert about unsupported file type
      Alert.alert(
        'Unsupported File Type',
        `The file type ${contentType} (like .docx) is not supported by the AI. \n\nFor best results, please use PDF, JPG, PNG, or text files.`,
        [{ text: 'OK', onPress: () => console.log('User acknowledged unsupported file format') }]
      );
    }
    
    // Prepare the contents array with text and possibly image
    const contents = [
      {
        role: "user",
        parts: parts
      }
    ];
    
    console.log('Sending request to Gemini API');
    
    // Generate content with text and image
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4000,
        responseMimeType: "application/json",
      },
    });
    
    const response = result.response;
    console.log('Gemini API response received');
    
    // Format response to match the expected structure from AIMLAPI
    return {
      choices: [
        {
          message: {
            content: response.text(),
          }
        }
      ]
    };
  };

  // Attempt processing with all available APIs
  const attemptProcessing = async (base64Content, contentType, userMessage, systemMessage) => {
    // Try each AIMLAPI key
    for (const apiKey of AIMLAPI_KEYS) {
      try {
        return await processWithAIMLAPI(apiKey, base64Content, contentType, userMessage, systemMessage);
      } catch (error) {
        console.warn(`AIMLAPI key ending in ...${apiKey.slice(-4)} failed:`, error.message);
        // Continue to next key
      }
    }
    
    // If all AIMLAPI keys fail, try Gemini API
    try {
      return await processWithGeminiAPI(base64Content, contentType, userMessage, systemMessage);
    } catch (error) {
      console.error('Gemini API failed:', error);
      throw new Error('All API attempts failed. Please try again later.');
    }
  };

  // Process the uploaded content with AI
  const processWithAI = async () => {
    if (!file) {
      Alert.alert('Error', 'Please upload a file first');
      return;
    }

    if (!title) {
      Alert.alert('Error', 'Please provide a title for this material');
      return;
    }

    // Use the activeClassId instead of classId from context
    if (!activeClassId) {
      Alert.alert('Error', 'No class selected. Please join or select a class first.');
      console.error('No active class ID found. Context classId:', classId, 
                    'Current class:', currentClass?.id, 
                    'Active classId state:', activeClassId);
      return;
    }

    setLoading(true);

    try {
      console.log('Starting AI processing for class:', activeClassId);
      
      // Validate file data
      if (!file.content) {
        console.error('File content is missing or empty');
        throw new Error('Image data is missing or corrupted. Please try uploading again.');
      }
      
      const base64Content = file.content;
      const contentType = file.type || 'image/jpeg';
      console.log('Image data length:', base64Content.length, 'Content type:', contentType);

      // Prepare user message based on file type
      let userMessage = '';
      if (uploadType === 'image') {
        userMessage = `Here is an image that contains text or information to understand. ${prompt ? 'Additional context: ' + prompt : ''}`;
      } else {
        userMessage = `Here is a document that contains text or information to understand. ${prompt ? 'Additional context: ' + prompt : ''}`;
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

The number of questions should be proportional to the complexity and length of the material, with a minimal of 3 questions. Make sure you respond with the language that the user is using.`;

      // Try processing with available APIs
      const responseData = await attemptProcessing(base64Content, contentType, userMessage, systemMessage);
      
      console.log('API response received:', JSON.stringify(responseData).substring(0, 200) + '...');
      
      // Check if responseData has the expected structure
      if (!responseData || !responseData.choices || !responseData.choices.length) {
        console.error('Unexpected API response format:', responseData);
        throw new Error('API returned an unexpected response format');
      }
      
      // Extract and parse the response
      const aiResponse = responseData.choices[0]?.message?.content;
      
      if (!aiResponse) {
        console.error('No content in AI response:', responseData);
        throw new Error('API response is missing content');
      }
      
      console.log('AI response content:', aiResponse?.substring(0, 100)); // Log the first 100 chars
      
      // Robust JSON parsing with better error handling
      let parsedResponse;
      try {
        // Some models might return markdown-formatted JSON with backticks
        // Remove any markdown code block indicators if present
        const cleanedResponse = aiResponse.replace(/^```json\s*|```\s*$/g, '');
        parsedResponse = JSON.parse(cleanedResponse);
        console.log('JSON parsed successfully');
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response content causing parse error:', aiResponse);
        throw new Error('Failed to parse AI response as JSON. Try again or use a different model.');
      }
      
      // Validate the parsed response has expected properties
      if (!parsedResponse.summary || !parsedResponse.quiz || !Array.isArray(parsedResponse.quiz)) {
        console.error('Invalid response format:', parsedResponse);
        throw new Error('AI response is missing required fields (summary or quiz)');
      }
      
      // Sanitize quiz data to ensure no undefined values (Firestore doesn't accept undefined)
      const sanitizedQuiz = parsedResponse.quiz.map(question => {
        // Ensure all required question fields exist
        const sanitizedQuestion = {
          question: question.question || 'Question missing',
          options: Array.isArray(question.options) ? 
            // Make sure no undefined values in options array
            question.options.map(opt => opt || 'Option missing') : 
            ['Option missing', 'Option missing', 'Option missing', 'Option missing'],
          correctAnswer: typeof question.correctAnswer === 'number' ? 
            question.correctAnswer : 0
        };
        
        // Ensure correctAnswer is within valid range (0-3)
        if (sanitizedQuestion.correctAnswer < 0 || 
            sanitizedQuestion.correctAnswer >= sanitizedQuestion.options.length) {
          sanitizedQuestion.correctAnswer = 0;
        }
        
        return sanitizedQuestion;
      });
      
      // Create a material record in Firestore
      const materialData = {
        title,
        prompt: prompt || '',
        fileType: fileType || 'unknown',
        fileName: file.name || 'unnamed',
        uploadType: uploadType || 'image',
        summary: parsedResponse.summary || 'No summary available',
        quizQuestions: sanitizedQuiz,
        createdAt: firestore.FieldValue.serverTimestamp(),
        createdBy: {
          uid: currentUser?.uid || 'anonymous',
          displayName: currentUser?.displayName || '',
          email: currentUser?.email || '',
        },
        classId: activeClassId, // Use the resolved classId
        scoreBoard: [],
      };

      console.log('Prepared Firestore document:', JSON.stringify(materialData));
      
      // Validate entire document to ensure no undefined values
      const validateFirestoreDoc = (obj) => {
        for (const key in obj) {
          if (obj[key] === undefined) {
            console.error(`Found undefined value in document at key: ${key}`);
            obj[key] = null; // Replace undefined with null
          }
          
          // Special handling for arrays
          if (Array.isArray(obj[key])) {
            // Check for undefined elements or empty arrays
            if (obj[key].length === 0) {
              console.warn(`Empty array found at key: ${key}, adding default item`);
              // Add default item depending on context
              if (key === 'quizQuestions') {
                obj[key] = [{
                  question: 'Default question',
                  options: ['Option A', 'Option B', 'Option C', 'Option D'],
                  correctAnswer: 0
                }];
              } else {
                obj[key] = ['Default item']; // Generic default
              }
            }
            
            // Check array items
            for (let i = 0; i < obj[key].length; i++) {
              if (obj[key][i] === undefined) {
                console.error(`Found undefined value in array at ${key}[${i}]`);
                obj[key][i] = null;
              } else if (typeof obj[key][i] === 'object' && obj[key][i] !== null) {
                validateFirestoreDoc(obj[key][i]); // Recursively check objects in array
              }
            }
            
            // Remove _elements property if exists (causes Firestore errors)
            if (obj[key]._elements !== undefined) {
              console.warn(`Found _elements property in array at key: ${key}, removing it`);
              delete obj[key]._elements;
            }
          } 
          // Check nested objects
          else if (typeof obj[key] === 'object' && obj[key] !== null) {
            // Check for special Firebase timestamp objects and don't validate them
            if (obj[key]._type === 'timestamp') {
              continue; // Skip validating Firebase timestamp objects
            }
            
            validateFirestoreDoc(obj[key]); // Recursively check nested objects
          }
        }
      };
      
      // Run validation to catch any undefined values
      validateFirestoreDoc(materialData);
      
      // Save to Firestore
      try {
        console.log('Saving AI material to class:', activeClassId);
        // Store AI material as a subcollection of the class
        await firestore()
          .collection('classes')
          .doc(activeClassId)
          .collection('aiMaterials')
          .add(materialData);
        
        Alert.alert('Success', 'Material processed and quiz created successfully!');
        navigation.goBack();
      } catch (firestoreError) {
        console.error('Firestore save error:', firestoreError);
        Alert.alert(
          'Error',
          'Failed to save the processed material to the database. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error processing with AI:', error);
      Alert.alert(
        'Error', 
        'Failed to process with AI: ' + (error.message || 'Unknown error')
      );
    } finally {
      setLoading(false);
    }
  };

  const renderFilePreview = () => {
    if (!file) return null;

    if (uploadType === 'image') {
      return (
        <View style={styles.filePreview}>
          <Image 
            source={{ uri: file.uri }} 
            style={styles.imagePreview} 
            resizeMode="contain" 
          />
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
        </View>
      );
    }

    // Select appropriate icon based on document type
    let iconName = 'file-document';
    let iconColor = Colors.primaryLight;
    
    if (fileType?.includes('pdf')) {
      iconName = 'file-pdf-box';
      iconColor = '#f44336'; // Red for PDF
    } else if (fileType?.includes('word') || fileType?.includes('doc')) {
      iconName = 'file-word-box';
      iconColor = '#2196f3'; // Blue for Word
    } else if (fileType?.includes('text') || fileType?.includes('txt')) {
      iconName = 'file-text';
      iconColor = '#9e9e9e'; // Gray for Text
    } else if (fileType?.includes('excel') || fileType?.includes('sheet')) {
      iconName = 'file-excel-box';
      iconColor = '#4caf50'; // Green for Excel
    } else if (fileType?.includes('ppt') || fileType?.includes('presentation')) {
      iconName = 'file-powerpoint-box';
      iconColor = '#ff9800'; // Orange for PowerPoint
    }

    // Calculate file size if content exists
    const fileSize = file.content ? Math.round((file.content.length * 3) / 4 / 1024) : '?';
    
    return (
      <View style={styles.filePreview}>
        <Icon name={iconName} size={70} color={iconColor} />
        <Text style={styles.fileName} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={styles.fileSize}>
          {fileSize} KB
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader 
        title={t('Add Material for AI')} 
        showBack={true} 
      />
      
      <ScrollView style={styles.content}>
        <Text style={styles.warningText}>
          ⚠️ {t('Be cautious of AI token usage. Processing large files may consume more resources.')}
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder={t('Material Title')}
          placeholderTextColor={Colors.textSecondary}
          value={title}
          onChangeText={setTitle}
        />
        
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder={t('Additional Prompt (optional)')}
          placeholderTextColor={Colors.textSecondary}
          value={prompt}
          onChangeText={setPrompt}
          multiline
          numberOfLines={3}
        />
        
        {renderFilePreview()}
        
        <View style={styles.uploadButtons}>
          <TouchableOpacity 
            style={styles.uploadButton} 
            onPress={takePhoto}
          >
            <Icon name="camera" size={22} color={Colors.text} />
            <Text style={styles.uploadButtonText}>{t('Camera')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.uploadButton} 
            onPress={pickImage}
          >
            <Icon name="image" size={22} color={Colors.text} />
            <Text style={styles.uploadButtonText}>{t('Gallery')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.uploadButton} 
            onPress={pickDocument}
          >
            <Icon name="file-document" size={22} color={Colors.text} />
            <Text style={styles.uploadButtonText}>{t('Document')}</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.processButton,
            (!file || !title || loading) && styles.processButtonDisabled
          ]}
          onPress={processWithAI}
          disabled={!file || !title || loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <>
              <Icon name="robot" size={20} color={Colors.text} />
              <Text style={styles.processButtonText}>
                {t('Process with AI')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 100,
  },
  warningText: {
    color: Colors.warning,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.warning,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    color: Colors.text,
    padding: 12,
    marginBottom: 16,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  uploadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  uploadButton: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  uploadButtonText: {
    color: Colors.text,
    marginLeft: 8,
  },
  processButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 80,
  },
  processButtonDisabled: {
    opacity: 0.5,
  },
  processButtonText: {
    color: Colors.text,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  filePreview: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileName: {
    color: Colors.text,
    marginTop: 8,
  },
  fileSize: {
    color: Colors.textSecondary,
    marginTop: 4,
  },
});

export default AddAiMaterial; 