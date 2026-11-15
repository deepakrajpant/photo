import {auth} from './firebase.js';
import {onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,browserLocalPersistence,updateProfile,reload} from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js';
import {get,save,cacheUser,cache,serverTimestamp} from './services/db.js';
import {fail} from './utils.js';
import {permissions,isPrimaryEmail,isPrimaryAdmin} from './services/access.js';
export const session={user:null,profile:null,role:null,access:null,issues:[],ready:false};
export const canAdmin=()=>permissions(session.user,session.role).admin;
export const canEdit=()=>permissions(session.user,session.role).edit;
export const canManage=()=>permissions(session.user,session.role).manage;
export const canDelegate=()=>permissions(session.user,session.role).delegate;
let listener=null,authGeneration=0;
export async function refreshSession(user=auth.currentUser){const generation=++authGeneration;session.ready=false;session.user=user;session.role=isPrimaryAdmin(user)?{role:'owner',enabled:true,source:'verified-owner-email'}:null;session.access=null;session.issues=[];cacheUser(user?.uid);if(!user){session.profile=null;session.ready=true;return;}
 const defaults={displayName:user.displayName||user.email?.split('@')[0]||'Student',email:user.email||'',dailyQuestionGoal:20,dailyMinutesGoal:30,targetExamId:'',preferences:{theme:'light',language:'en'}};
 session.profile=defaults;
 const paths=[`users/${user.uid}`,`adminRoles/${user.uid}`,`users/${user.uid}/access/current`];const results=await Promise.allSettled(paths.map(path=>get(path,{fresh:true})));
 if(generation!==authGeneration)return;
 for(let i=0;i<results.length;i++)if(results[i].status==='rejected'){console.error('Account setup read failed',paths[i],results[i].reason);session.issues.push({path:paths[i],code:results[i].reason?.code||'read-failed'});}
 const [profile,role,access]=results.map(r=>r.status==='fulfilled'?r.value:null);
 if(profile)session.profile={...defaults,...profile,preferences:{...defaults.preferences,...profile.preferences}};
 if(!isPrimaryAdmin(user))session.role=role;
 session.access=access;
 if(results[0].status==='fulfilled'&&navigator.onLine){try{if(!profile)await save(paths[0],{...defaults,createdAt:serverTimestamp()});else if(user.emailVerified){const patch={};for(const key of ['displayName','dailyQuestionGoal','dailyMinutesGoal'])if(profile[key]===undefined)patch[key]=defaults[key];if(Object.keys(patch).length)await save(paths[0],patch);}}catch(error){console.error('Profile provisioning failed',error);session.issues.push({path:paths[0],code:error.code||'profile-save-failed'});}}
 session.ready=true;
}
export async function initAuth(callback){listener=callback;await setPersistence(auth,browserLocalPersistence);return onAuthStateChanged(auth,async user=>{try{await refreshSession(user);await callback();}catch(error){await callback(error);}});}
export async function login(email,password){await signInWithEmailAndPassword(auth,email,password);}
export async function signup(name,email,password){if(password.length<8)fail('Use at least 8 characters for your password.');const settings=await get('appSettings/policy');if(settings?.registrationOpen===false)fail('Registration is currently closed.');const {user}=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(user,{displayName:name});await sendEmailVerification(user);}
export async function googleLogin(){await signInWithPopup(auth,new GoogleAuthProvider());}
export const resetPassword=email=>sendPasswordResetEmail(auth,email);
export const verifyEmail=()=>sendEmailVerification(auth.currentUser);
export async function refreshUser(){if(!auth.currentUser)fail('Sign in to refresh your account.');await reload(auth.currentUser);await auth.currentUser.getIdToken(true);await refreshSession(auth.currentUser);}
export async function logout(){let cacheError=null;try{await cache.clearPrivate();}catch(error){console.error('Private cache cleanup failed',error);cacheError=error;}await signOut(auth);cacheUser(null);location.hash='/login';if(cacheError)fail('You are signed out, but this browser could not clear its local study cache. Clear site data on a shared device.');}
