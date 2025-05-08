import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';

const CommentItem = ({ comment, onDelete, onEdit, isAdmin }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditText(comment.text);
  };

  const handleSave = async () => {
    if (editText.trim() === '') return;
    
    setIsLoading(true);
    try {
      await onEdit(comment.id, editText);
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditText(comment.text);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete(comment.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.username}>{comment.userName}</Text>
        <Text style={styles.date}>
          {formatDate(comment.createdAt)}
          {comment.edited && <Text style={styles.editedLabel}> (edited)</Text>}
        </Text>
      </View>
      
      {isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            multiline
            autoFocus
          />
          <View style={styles.editActions}>
            <TouchableOpacity 
              style={[styles.editButton, styles.cancelButton]} 
              onPress={handleCancel}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.editButton, styles.saveButton]} 
              onPress={handleSave}
              disabled={isLoading || editText.trim() === ''}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.text}>{comment.text}</Text>
          
          {(comment.isOwnComment || isAdmin) && (
            <View style={styles.actions}>
              {comment.isOwnComment && (
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleEdit}
                  disabled={isLoading}
                >
                  <Icon name="edit" size={18} color={Colors.accent} />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={Colors.error} />
                ) : (
                  <Icon name="delete" size={18} color={Colors.error} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  username: {
    fontWeight: 'bold',
    color: Colors.text,
    fontSize: 14,
  },
  date: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  editedLabel: {
    fontStyle: 'italic',
  },
  text: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    padding: 5,
    marginLeft: 10,
  },
  editContainer: {
    marginBottom: 10,
  },
  editInput: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 4,
    padding: 10,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  editButton: {
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.success,
  },
  buttonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CommentItem; 