package com.unither

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.graphics.Color
import android.os.Build

object NotificationChannelManager {
    const val DEFAULT_CHANNEL_ID = "taskmaster-default"
    const val ASSIGNMENTS_CHANNEL_ID = "taskmaster-assignments"
    const val MATERIALS_CHANNEL_ID = "taskmaster-materials"
    const val GRADES_CHANNEL_ID = "taskmaster-grades"
    const val APPROVALS_CHANNEL_ID = "taskmaster-approvals"
    const val GALLERY_CHANNEL_ID = "taskmaster-gallery"

    fun createNotificationChannels(context: Context) {
        // Only needed for Android Oreo and above
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(NotificationManager::class.java)

            // Default channel (required)
            createChannel(
                notificationManager,
                DEFAULT_CHANNEL_ID,
                "General Notifications",
                "General TaskMaster notifications",
                NotificationManager.IMPORTANCE_DEFAULT
            )

            // Assignments channel
            createChannel(
                notificationManager,
                ASSIGNMENTS_CHANNEL_ID,
                "Assignments",
                "Notifications about new assignments",
                NotificationManager.IMPORTANCE_HIGH
            )

            // Materials channel
            createChannel(
                notificationManager,
                MATERIALS_CHANNEL_ID,
                "Study Materials",
                "Notifications about new study materials",
                NotificationManager.IMPORTANCE_DEFAULT
            )

            // Grades channel
            createChannel(
                notificationManager,
                GRADES_CHANNEL_ID,
                "Grades",
                "Notifications about graded assignments",
                NotificationManager.IMPORTANCE_HIGH
            )

            // Approvals channel
            createChannel(
                notificationManager,
                APPROVALS_CHANNEL_ID,
                "Approvals",
                "Notifications about approved requests",
                NotificationManager.IMPORTANCE_DEFAULT
            )

            // Gallery channel
            createChannel(
                notificationManager,
                GALLERY_CHANNEL_ID,
                "Gallery",
                "Notifications about new gallery images",
                NotificationManager.IMPORTANCE_DEFAULT
            )
        }
    }

    private fun createChannel(
        notificationManager: NotificationManager,
        channelId: String,
        channelName: String,
        channelDescription: String,
        importance: Int
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                channelName,
                importance
            ).apply {
                description = channelDescription
                enableLights(true)
                lightColor = Color.BLUE
                enableVibration(true)
                vibrationPattern = longArrayOf(100, 200, 300, 400, 500)
            }
            
            notificationManager.createNotificationChannel(channel)
        }
    }
}
