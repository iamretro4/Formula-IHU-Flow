import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Profile } from "@/types";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        
        // Handle error - PGRST116 means no rows found, which is expected if profile doesn't exist
        if (error) {
          if (error.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const { data: newProfile, error: createError } = await supabase
              .from("profiles")
              .insert({
                id: user.id,
                full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
                email: user.email || "",
              })
              .select()
              .single();
            
            if (createError) {
              console.error("Error creating profile:", createError);
              setProfile(null);
            } else {
              setProfile(newProfile);
            }
          } else {
            console.error("Error fetching profile:", error);
            setProfile(null);
          }
        } else if (profileData) {
          setProfile(profileData);
        } else {
          // No error but no data - profile doesn't exist, create it
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
              email: user.email || "",
            })
            .select()
            .single();
          
          if (createError) {
            console.error("Error creating profile:", createError);
            setProfile(null);
          } else {
            setProfile(newProfile);
          }
        }
      }
      
      setLoading(false);
    };
    
    fetchUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const { data: profileData, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();
          
          // Handle error - PGRST116 means no rows found, which is expected if profile doesn't exist
          if (error) {
            if (error.code === 'PGRST116') {
              // Profile doesn't exist, create it
              const { data: newProfile, error: createError } = await supabase
                .from("profiles")
                .insert({
                  id: session.user.id,
                  full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
                  email: session.user.email || "",
                })
                .select()
                .single();
              
              if (createError) {
                console.error("Error creating profile:", createError);
                setProfile(null);
              } else {
                setProfile(newProfile);
              }
            } else {
              console.error("Error fetching profile:", error);
              setProfile(null);
            }
          } else if (profileData) {
            setProfile(profileData);
          } else {
            // No error but no data - profile doesn't exist, create it
            const { data: newProfile, error: createError } = await supabase
              .from("profiles")
              .insert({
                id: session.user.id,
                full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
                email: session.user.email || "",
              })
              .select()
              .single();
            
            if (createError) {
              console.error("Error creating profile:", createError);
              setProfile(null);
            } else {
              setProfile(newProfile);
            }
          }
        } else {
          setProfile(null);
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  return { user, profile, loading };
};

